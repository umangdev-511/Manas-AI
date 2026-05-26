import React, { useRef, useState } from 'react';
import './styles/App.css';

import ConversationPanel from './components/ConversationPanel.jsx';
import AgentDashboard from './components/AgentDashboard.jsx';

import { getSunnaResponse } from './agents/sunna.js';
import { scoreMessage } from './agents/samajhna.js';
import { routeCase } from './agents/nirdeshak.js';
import { generateCounsellorBrief } from './agents/setu.js';

const INITIAL_AGENT_STATUSES = {
  sunna: 'STANDBY',
  samajhna: 'STANDBY',
  nirdeshak: 'STANDBY',
  setu: 'STANDBY',
};

function createId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function buildScoreLog(agentName, scaleName, previousScore, nextScore, delta) {
  if (delta === 0) {
    return `${agentName}: ${scaleName} unchanged at ${nextScore}`;
  }

  return `${agentName}: ${scaleName} updated ${previousScore} → ${nextScore} (+${delta})`;
}

function createPendingBrief({
  phqScore,
  gadScore,
  riskLevel,
  triggeredKeywords,
  escalationReason,
}) {
  return {
    severityBadge: riskLevel,
    phq9Score: phqScore,
    gad7Score: gadScore,
    riskLevel: riskLevel === 'SEVERE' ? 'Critical' : 'High',
    keyTriggers: triggeredKeywords.length ? triggeredKeywords : ['threshold exceeded'],
    conversationSummary: ['Setu is generating the structured counsellor summary.'],
    recommendedOpener: 'I can see you have been carrying a lot lately. I am here with you, and I have time to listen.',
    escalationReason,
    sessionDuration: 'In progress',
    timestamp: new Date().toISOString(),
    isPending: true,
  };
}

function wait(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

export default function App() {
  const [messages, setMessages] = useState([]);
  const [agentStatuses, setAgentStatuses] = useState(INITIAL_AGENT_STATUSES);
  const [phqScore, setPhqScore] = useState(0);
  const [gadScore, setGadScore] = useState(0);
  const [riskLevel, setRiskLevel] = useState('MINIMAL');
  const [activityLog, setActivityLog] = useState([]);
  const [isEscalated, setIsEscalated] = useState(false);
  const [counsellorBrief, setCounsellorBrief] = useState(null);
  const [isSunnaLoading, setIsSunnaLoading] = useState(false);
  const [sessionResetKey, setSessionResetKey] = useState(0);
  const sessionStartedAt = useRef(new Date().toISOString());
  const escalationStartedRef = useRef(false);

  const addActivity = (message) => {
    setActivityLog((currentLog) => [
      {
        id: createId('log'),
        timestamp: new Date(),
        message,
      },
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
    setPhqScore(0);
    setGadScore(0);
    setRiskLevel('MINIMAL');
    setActivityLog([]);
    setIsEscalated(false);
    setCounsellorBrief(null);
    setIsSunnaLoading(false);
    setSessionResetKey((currentKey) => currentKey + 1);
    sessionStartedAt.current = new Date().toISOString();
    escalationStartedRef.current = false;
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

    setAgentStatus('sunna', 'LISTENING');
    addActivity('Sunna: GPT-4o response requested');

    const sunnaPromise = Promise.all([
      getSunnaResponse(conversationForAgents),
      wait(650),
    ]).then(([responseText]) => responseText);

    // Samajhna runs immediately and independently from Sunna's response cycle.
    setAgentStatus('samajhna', 'SCORING');
    addActivity('Samajhna: Silent PHQ-9/GAD-7 scoring started');

    const scoringResult = scoreMessage(messageText, phqScore, gadScore);
    setPhqScore(scoringResult.newPHQ);
    setGadScore(scoringResult.newGAD);
    addActivity(buildScoreLog('Samajhna', 'PHQ-9', phqScore, scoringResult.newPHQ, scoringResult.phqDelta));
    addActivity(buildScoreLog('Samajhna', 'GAD-7', gadScore, scoringResult.newGAD, scoringResult.gadDelta));

    if (scoringResult.triggeredKeywords.length > 0) {
      addActivity(`Samajhna: Signals detected — ${scoringResult.triggeredKeywords.join(', ')}`);
    }

    setAgentStatus('samajhna', 'COMPLETE');

    setAgentStatus('nirdeshak', 'ROUTING');
    addActivity('Nirdeshak: Autonomous threshold check started');

    const routeDecision = routeCase({
      phqScore: scoringResult.newPHQ,
      gadScore: scoringResult.newGAD,
      crisisKeywordFound: scoringResult.crisisKeywordFound,
    });

    setRiskLevel(routeDecision.riskLevel);

    if (routeDecision.shouldEscalate) {
      setAgentStatus('nirdeshak', 'ESCALATED');
      addActivity(`Nirdeshak: ESCALATION TRIGGERED — ${routeDecision.reason}`);

      if (!escalationStartedRef.current) {
        escalationStartedRef.current = true;
        setIsEscalated(true);
        setAgentStatus('setu', 'BRIEFING');
        addActivity('Setu: Generating counsellor brief...');
        setCounsellorBrief(createPendingBrief({
          phqScore: scoringResult.newPHQ,
          gadScore: scoringResult.newGAD,
          riskLevel: routeDecision.riskLevel,
          triggeredKeywords: scoringResult.triggeredKeywords,
          escalationReason: routeDecision.reason,
        }));

        generateCounsellorBrief({
          conversationHistory: conversationForAgents,
          phqScore: scoringResult.newPHQ,
          gadScore: scoringResult.newGAD,
          riskLevel: routeDecision.riskLevel,
          triggeredKeywords: scoringResult.triggeredKeywords,
          escalationReason: routeDecision.reason,
          sessionStartedAt: sessionStartedAt.current,
        })
          .then((brief) => {
            setCounsellorBrief({
              ...brief,
              phq9Score: scoringResult.newPHQ,
              gad7Score: scoringResult.newGAD,
              severityBadge: routeDecision.riskLevel,
              escalationReason: routeDecision.reason,
              isPending: false,
            });
            setAgentStatus('setu', 'COMPLETE');
            addActivity('Setu: Brief ready — counsellor dashboard active');
          })
          .catch((error) => {
            setAgentStatus('setu', 'COMPLETE');
            addActivity(`Setu: Brief generation failed — ${error.message}`);
          });
      }
    } else {
      setAgentStatus('nirdeshak', 'COMPLETE');
      addActivity(`Nirdeshak: ${routeDecision.reason}`);
    }

    try {
      const responseText = await sunnaPromise;
      const manasMessage = {
        id: createId('manas'),
        role: 'manas',
        content: responseText,
        timestamp: new Date(),
      };

      setMessages((currentMessages) => [...currentMessages, manasMessage]);
      setAgentStatus('sunna', 'COMPLETE');
      addActivity('Sunna: Response sent to user');
    } catch (error) {
      const fallbackMessage = {
        id: createId('manas'),
        role: 'manas',
        content: 'I am here with you. Something briefly went wrong while I was responding, but you can keep sharing what is on your mind.',
        timestamp: new Date(),
      };

      setMessages((currentMessages) => [...currentMessages, fallbackMessage]);
      setAgentStatus('sunna', 'COMPLETE');
      addActivity(`Sunna: GPT call failed — ${error.message}`);
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
        />
      </section>

      <section className="app-shell__dashboard">
        <AgentDashboard
          agentStatuses={agentStatuses}
          phqScore={phqScore}
          gadScore={gadScore}
          riskLevel={riskLevel}
          activityLog={activityLog}
          isEscalated={isEscalated}
          counsellorBrief={counsellorBrief}
          onResetSession={handleResetSession}
          sessionResetKey={sessionResetKey}
        />
      </section>
    </main>
  );
}
