import React, { useState } from 'react';
import './styles/App.css';

import LandingScreen from './components/LandingScreen.jsx';
import ConversationPanel from './components/ConversationPanel.jsx';
import AgentDashboard from './components/AgentDashboard.jsx';

import { getSunnaResponse } from './agents/sunna.js';
import {
  generateContextualReply,
  translateForSafetyAnalysis,
  translateReply,
} from './services/sarvamVoice.js';
import {
  analyzeMessage,
  getInitialTriageState,
  resetTriageState,
} from './triage/triageEngine.js';

const INITIAL_AGENT_STATUSES = {
  sunna: 'STANDBY',
  samajhna: 'STANDBY',
  nirdeshak: 'STANDBY',
  setu: 'STANDBY',
};

const JUDGE_DEMO_STEPS = [
  {
    label: 'Early distress',
    message: 'I have been feeling low and tired lately.',
  },
  {
    label: 'Isolation',
    message: 'I have no one to share with.',
  },
  {
    label: 'Human support recommended',
    message: 'I feel hopeless and worthless.',
  },
  {
    label: 'Urgent escalation',
    message: 'I want to kill myself.',
  },
];

function createId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function getLastManasMessage(messages) {
  return [...messages].reverse().find((message) => message.role === 'manas')?.content || '';
}

export default function App() {
  const [showLanding, setShowLanding] = useState(true);
  const [messages, setMessages] = useState([]);
  const [agentStatuses, setAgentStatuses] = useState(INITIAL_AGENT_STATUSES);
  const [triageState, setTriageState] = useState(getInitialTriageState);
  const [activityLog, setActivityLog] = useState([]);
  const [isEscalated, setIsEscalated] = useState(false);
  const [isSunnaLoading, setIsSunnaLoading] = useState(false);
  const [conversationError, setConversationError] = useState('');
  const [sessionResetKey, setSessionResetKey] = useState(0);
  const [isJudgeDemoMode, setIsJudgeDemoMode] = useState(false);
  const [judgeDemoStepIndex, setJudgeDemoStepIndex] = useState(0);
  const [voiceReplyRequest, setVoiceReplyRequest] = useState(null);
  const [showInsights, setShowInsights] = useState(false);

  const addActivity = (event) => {
    setActivityLog((currentLog) => [
      {
        id: createId('log'),
        timestamp: new Date(),
        ...(typeof event === 'string' ? { message: event } : event),
      },
      ...currentLog,
    ]);
  };

  const addActivities = (events) => {
    setActivityLog((currentLog) => [
      ...events.slice().reverse().map((event) => ({
        id: createId('log'),
        timestamp: new Date(),
        ...(typeof event === 'string' ? { message: event } : event),
      })),
      ...currentLog,
    ]);
  };

  const setAgentStatus = (agentName, status) => {
    setAgentStatuses((currentStatuses) => ({
      ...currentStatuses,
      [agentName]: status,
    }));
  };

  const handleResetSession = () => {
    setMessages([]);
    setAgentStatuses(INITIAL_AGENT_STATUSES);
    setTriageState(resetTriageState());
    setActivityLog([]);
    setIsEscalated(false);
    setIsSunnaLoading(false);
    setConversationError('');
    setIsJudgeDemoMode(false);
    setJudgeDemoStepIndex(0);
    setVoiceReplyRequest(null);
    setShowInsights(false);
    setSessionResetKey((currentKey) => currentKey + 1);
  };

  const handleToggleJudgeDemo = () => {
    setIsJudgeDemoMode((currentValue) => !currentValue);
  };

  const handleEnterDemo = () => {
    setShowLanding(false);
  };

  const handleEnterJudgeDemo = () => {
    setShowLanding(false);
    setIsJudgeDemoMode(true);
    setShowInsights(true);
  };

  const updatePortalCase = (updater) => {
    setTriageState((currentState) => {
      if (!currentState.portalCase) return currentState;

      return {
        ...currentState,
        portalCase: updater(currentState.portalCase),
      };
    });
  };

  const handleMarkCaseReviewed = () => {
    updatePortalCase((portalCase) => ({
      ...portalCase,
      reviewed: true,
      status: portalCase.status.includes('Reviewed') ? portalCase.status : `${portalCase.status} - Reviewed`,
    }));
  };

  const handleStartSafetyAssessment = () => {
    updatePortalCase((portalCase) => ({
      ...portalCase,
      safetyAssessmentStarted: true,
      activeSafetyQuestion: portalCase.safetyChecklist?.[0] || 'What feels most urgent right now?',
    }));
  };

  const handleSimulateHumanHandoff = () => {
    updatePortalCase((portalCase) => ({
      ...portalCase,
      handoffSimulated: true,
      status: 'Human Handoff Simulated',
    }));
  };

  const handleJudgeDemoStep = (stepIndex) => {
    if (isSunnaLoading || stepIndex !== judgeDemoStepIndex) return;

    const step = JUDGE_DEMO_STEPS[stepIndex];
    setJudgeDemoStepIndex((currentIndex) => Math.min(currentIndex + 1, JUDGE_DEMO_STEPS.length));
    handleSendMessage(step.message);
  };

  const handleSendMessage = async (messageText, options = {}) => {
    const userMessage = {
      id: createId('user'),
      role: 'user',
      content: messageText,
      timestamp: new Date(),
    };
    const conversationForAgents = [...messages, userMessage];

    setMessages(conversationForAgents);
    setIsSunnaLoading(true);
    setConversationError('');

    let analysisMessageText = messageText;
    if (options.languageCode && options.languageCode !== 'en-IN') {
      try {
        analysisMessageText = await translateForSafetyAnalysis(messageText);
      } catch (translationError) {
        setConversationError('Manas could not translate this message for its safety check. Please use the human-support option if you may be in immediate danger.');
        addActivity({
          agent: 'Samajhna',
          action: 'Multilingual safety translation unavailable',
          detail: translationError.message,
          severity: 'watch',
        });
      }
    }

    // Samajhna runs immediately and independently from Sunna's response cycle.
    setAgentStatus('samajhna', 'SCORING');

    const previousTriageState = triageState;
    const nextTriageState = analyzeMessage(analysisMessageText, previousTriageState, {
      previousAssistantMessage: getLastManasMessage(messages),
    });
    setTriageState(nextTriageState);
    addActivities(nextTriageState.agentEvents);

    setAgentStatus('sunna', 'LISTENING');
    addActivity({
      agent: 'Sunna',
      action: 'Guarded response selected',
      detail: `${nextTriageState.riskLevel} risk context`,
      severity: nextTriageState.riskLevel === 'CRITICAL' ? 'critical' : nextTriageState.riskLevel === 'HIGH' ? 'high' : 'info',
    });

    const sunnaPromise = getSunnaResponse(conversationForAgents, {
        detectedEvidence: nextTriageState.evidence,
        currentEvidence: nextTriageState.timeline[nextTriageState.timeline.length - 1]?.detectedEvidence.map((label) => (
          nextTriageState.evidence.find((item) => item.label === label) || { label }
        )),
        riskLevel: nextTriageState.riskLevel,
        route: nextTriageState.route,
        escalationLocked: nextTriageState.escalationLocked,
      });

    setAgentStatus('samajhna', 'COMPLETE');

    setAgentStatus('nirdeshak', 'ROUTING');

    if (nextTriageState.escalationLocked) {
      setAgentStatus('nirdeshak', 'ESCALATED');
      setIsEscalated(true);

      if (!previousTriageState.escalationLocked) {
        setAgentStatus('setu', 'BRIEFING');
      }

      setAgentStatus('setu', nextTriageState.counsellorBrief ? 'COMPLETE' : 'BRIEFING');
    } else {
      setIsEscalated(false);
      setAgentStatus('setu', 'STANDBY');

      setAgentStatus('nirdeshak', 'COMPLETE');
    }

    try {
      const sunnaResult = await sunnaPromise;
      if (sunnaResult.usedFallback && sunnaResult.errorMessage) {
        setConversationError(`${sunnaResult.errorMessage} Manas used a safe backup response so the session can continue.`);
      }
      let replyContent = sunnaResult.content;
      if (!['HIGH', 'CRITICAL'].includes(nextTriageState.riskLevel) && !nextTriageState.escalationLocked) {
        try {
          replyContent = await generateContextualReply({
            messages: conversationForAgents,
            riskLevel: nextTriageState.riskLevel,
            route: nextTriageState.route,
            escalationLocked: nextTriageState.escalationLocked,
            evidence: nextTriageState.evidence.slice(0, 6).map((item) => item.label),
          });
        } catch (replyError) {
          addActivity({
            agent: 'Sunna',
            action: 'Guarded fallback used',
            detail: replyError.message,
            severity: 'watch',
          });
        }
      }
      if (options.languageCode && options.languageCode !== 'en-IN') {
        try {
          replyContent = await translateReply(replyContent, options.languageCode);
        } catch (translationError) {
          setConversationError(`Translation failed: ${translationError.message}. Manas continued in English.`);
        }
      }

      const manasMessage = {
        id: createId('manas'),
        role: 'manas',
        content: replyContent,
        timestamp: new Date(),
      };

      setMessages((currentMessages) => [...currentMessages, manasMessage]);
      setVoiceReplyRequest({
        messageId: manasMessage.id,
        text: replyContent,
        languageCode: options.languageCode || 'en-IN',
      });
      setAgentStatus('sunna', 'COMPLETE');
    } catch (error) {
      const fallbackMessage = {
        id: createId('manas'),
        role: 'manas',
        content: 'I am here with you. Something went wrong in the response cycle, but this session can continue. Can you share what feels most urgent right now?',
        timestamp: new Date(),
      };

      setConversationError(`Response failed: ${error.message}. Manas used a backup response so the session can continue.`);
      setMessages((currentMessages) => [...currentMessages, fallbackMessage]);
      setVoiceReplyRequest({
        messageId: fallbackMessage.id,
        text: fallbackMessage.content,
        languageCode: options.languageCode || 'en-IN',
      });
      setAgentStatus('sunna', 'COMPLETE');
      addActivity({
        agent: 'Sunna',
        action: 'Response fallback used',
        detail: error.message,
        severity: 'watch',
      });
    } finally {
      setIsSunnaLoading(false);
    }
  };

  return showLanding ? (
    <LandingScreen
      onEnterDemo={handleEnterDemo}
      onEnterJudgeDemo={handleEnterJudgeDemo}
    />
  ) : (
    <main className="app-shell">
      <section className="app-shell__conversation">
        <ConversationPanel
          messages={messages}
          onSendMessage={handleSendMessage}
          isLoading={isSunnaLoading}
          errorMessage={conversationError}
          voiceReplyRequest={voiceReplyRequest}
          onVoiceReplyHandled={() => setVoiceReplyRequest(null)}
          riskLevel={triageState.riskLevel}
          onOpenInsights={() => setShowInsights(true)}
        />
      </section>

      {showInsights && (
        <div className="insights-overlay" role="dialog" aria-modal="true" aria-label="How Manas is helping" onClick={() => setShowInsights(false)}>
          <section className="insights-drawer" onClick={(event) => event.stopPropagation()}>
            <div className="insights-drawer__header">
              <div><span>Behind the conversation</span><h2>How Manas is helping</h2></div>
              <button type="button" onClick={() => setShowInsights(false)} aria-label="Close insights">×</button>
            </div>
            <AgentDashboard
          agentStatuses={agentStatuses}
          phqScore={triageState.phqScore}
          gadScore={triageState.gadScore}
          riskLevel={triageState.riskLevel}
          systemMode={triageState.systemMode}
          detectedEvidence={triageState.evidence}
          routeStatus={triageState.route}
          escalationLocked={triageState.escalationLocked}
          activityLog={activityLog}
          isEscalated={isEscalated}
          counsellorBrief={triageState.counsellorBrief}
          portalCase={triageState.portalCase}
          onMarkCaseReviewed={handleMarkCaseReviewed}
          onStartSafetyAssessment={handleStartSafetyAssessment}
          onSimulateHumanHandoff={handleSimulateHumanHandoff}
          onResetSession={handleResetSession}
          isJudgeDemoMode={isJudgeDemoMode}
          onToggleJudgeDemo={handleToggleJudgeDemo}
          demoSteps={JUDGE_DEMO_STEPS}
          demoStepIndex={judgeDemoStepIndex}
          isDemoBusy={isSunnaLoading}
          onDemoStepClick={handleJudgeDemoStep}
          sessionResetKey={sessionResetKey}
        />
          </section>
        </div>
      )}
    </main>
  );
}
