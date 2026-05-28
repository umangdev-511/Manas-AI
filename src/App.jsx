import React, { useState } from 'react';
import './styles/App.css';

import ConversationPanel from './components/ConversationPanel.jsx';
import AgentDashboard from './components/AgentDashboard.jsx';

import { getSunnaResponse } from './agents/sunna.js';
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

function wait(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

export default function App() {
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
    setSessionResetKey((currentKey) => currentKey + 1);
  };

  const handleToggleJudgeDemo = () => {
    setIsJudgeDemoMode((currentValue) => !currentValue);
  };

  const handleJudgeDemoStep = (stepIndex) => {
    if (isSunnaLoading || stepIndex !== judgeDemoStepIndex) return;

    const step = JUDGE_DEMO_STEPS[stepIndex];
    setJudgeDemoStepIndex((currentIndex) => Math.min(currentIndex + 1, JUDGE_DEMO_STEPS.length));
    handleSendMessage(step.message);
  };

  const handleSendMessage = async (messageText) => {
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

    setAgentStatus('sunna', 'LISTENING');
    addActivity({
      agent: 'Sunna',
      action: 'Intake response generated',
      detail: 'warm user-facing reply prepared',
      severity: 'info',
    });

    const sunnaPromise = Promise.all([
      getSunnaResponse(conversationForAgents),
      wait(650),
    ]).then(([responseText]) => responseText);

    // Samajhna runs immediately and independently from Sunna's response cycle.
    setAgentStatus('samajhna', 'SCORING');

    const previousTriageState = triageState;
    const nextTriageState = analyzeMessage(messageText, previousTriageState);
    setTriageState(nextTriageState);
    addActivities(nextTriageState.agentEvents);

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
      const manasMessage = {
        id: createId('manas'),
        role: 'manas',
        content: sunnaResult.content,
        timestamp: new Date(),
      };

      setMessages((currentMessages) => [...currentMessages, manasMessage]);
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

  return (
    <main className="app-shell">
      <section className="app-shell__conversation">
        <ConversationPanel
          messages={messages}
          onSendMessage={handleSendMessage}
          isLoading={isSunnaLoading}
          errorMessage={conversationError}
        />
      </section>

      <section className="app-shell__dashboard">
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
    </main>
  );
}
