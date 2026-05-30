import React, { useEffect, useMemo, useState } from 'react';
import AgentNode from './AgentNode.jsx';
import CounsellorBrief from './CounsellorBrief.jsx';
import '../styles/AgentDashboard.css';

const AGENTS = [
  {
    id: 'sunna',
    name: 'Sunna',
    hindiName: 'सुन्ना',
    meaning: 'to listen',
  },
  {
    id: 'samajhna',
    name: 'Samajhna',
    hindiName: 'समझना',
    meaning: 'to understand',
  },
  {
    id: 'nirdeshak',
    name: 'Nirdeshak',
    hindiName: 'निर्देशक',
    meaning: 'to guide',
  },
  {
    id: 'setu',
    name: 'Setu',
    hindiName: 'सेतु',
    meaning: 'bridge',
  },
];

const DEFAULT_STATUSES = {
  sunna: 'STANDBY',
  samajhna: 'STANDBY',
  nirdeshak: 'STANDBY',
  setu: 'STANDBY',
};

function formatElapsedTime(totalSeconds) {
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
  const seconds = String(totalSeconds % 60).padStart(2, '0');

  return `${minutes}:${seconds}`;
}

function formatLogTime(timestamp) {
  if (!timestamp) return '--:--';

  const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
  if (Number.isNaN(date.getTime())) return '--:--';

  return date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function clampScore(score, maxScore) {
  return Math.min(Math.max(Number(score) || 0, 0), maxScore);
}

function getPhqColor(score) {
  if (score >= 20) return '#991B1B';
  if (score >= 15) return '#EF4444';
  if (score >= 10) return '#F59E0B';
  if (score >= 5) return '#FBBF24';
  return '#10B981';
}

function getGadColor(score) {
  if (score >= 15) return '#EF4444';
  if (score >= 10) return '#F59E0B';
  if (score >= 5) return '#FBBF24';
  return '#10B981';
}

function getRiskColor(riskLevel) {
  const colors = {
    LOW: '#10B981',
    HIGH: '#EF4444',
    CRITICAL: '#991B1B',
    MINIMAL: '#10B981',
    MILD: '#FBBF24',
    MODERATE: '#F59E0B',
    'MODERATE-SEVERE': '#EF4444',
    SEVERE: '#991B1B',
  };

  return colors[riskLevel] || '#6B7280';
}

function formatRouteStatus(routeStatus) {
  const labels = {
    MONITOR: 'Monitoring natural conversation',
    CHECK_IN: 'Check-in recommended; continue signal tracking',
    HUMAN_RECOMMENDED: 'Human support recommended; monitoring for escalation',
    URGENT_ESCALATION: 'Critical risk locked; urgent handoff route active',
    EMERGENCY_PROTOCOL_RECOMMENDED: 'Immediate danger indicators; emergency protocol recommended',
    HANDOFF_READY: 'Counsellor brief ready before human joins',
  };

  return labels[routeStatus] || routeStatus;
}

function getRouteExplanation(routeStatus) {
  const explanations = {
    MONITOR: 'Mild distress indicators detected. Manas continues supportive intake.',
    CHECK_IN: 'Multiple distress or isolation signals detected. Manas asks targeted check-in questions.',
    HUMAN_RECOMMENDED: 'Hopelessness, worthlessness, or self-harm signals detected. Human review is recommended.',
    URGENT_ESCALATION: 'Explicit suicidal intent detected. Manas locked escalation and created an urgent crisis case.',
    EMERGENCY_PROTOCOL_RECOMMENDED: 'User may have immediate access to means or unsafe location. Manas recommends emergency protocol.',
  };

  return explanations[routeStatus] || explanations.MONITOR;
}

function formatRouteLabel(routeStatus) {
  return String(routeStatus || 'MONITOR').replace(/_/g, ' ');
}

function getRiskBadgeClass(riskLevel) {
  return `risk-badge risk-badge--${String(riskLevel || 'low').toLowerCase()}`;
}

function getSystemModeCopy(systemMode) {
  const copy = {
    LISTENING: {
      label: 'LISTENING',
      detail: 'Sunna is receiving natural user input.',
    },
    ASSESSING: {
      label: 'ASSESSING',
      detail: 'Samajhna is scoring silent risk signals.',
    },
    HUMAN_RECOMMENDED: {
      label: 'HUMAN RECOMMENDED',
      detail: 'Signals suggest a human counsellor should review if available.',
    },
    ESCALATING: {
      label: 'ESCALATING',
      detail: 'Nirdeshak has locked the case into an urgent handoff route.',
    },
    HANDOFF_READY: {
      label: 'HANDOFF READY',
      detail: 'Setu has prepared the counsellor brief.',
    },
  };

  return copy[systemMode] || copy.LISTENING;
}

function ScoreBar({ label, score, maxScore, color }) {
  const safeScore = clampScore(score, maxScore);
  const width = `${(safeScore / maxScore) * 100}%`;

  return (
    <div className="score-row">
      <div className="score-row__meta">
        <span>{label}</span>
        <strong>{safeScore} / {maxScore}</strong>
      </div>
      <div className="score-track" aria-hidden="true">
        <div
          className="score-fill"
          style={{
            width,
            backgroundColor: color,
            boxShadow: `0 0 18px ${color}55`,
          }}
        />
      </div>
    </div>
  );
}

function buildPortalCopy(portalCase, counsellorBrief) {
  if (!portalCase) return '';

  const lines = [
    `Case ID: ${portalCase.caseId}`,
    `Status: ${portalCase.status}`,
    `Priority: ${portalCase.priority}`,
    `Route: ${portalCase.route}`,
    `Assigned queue: ${portalCase.assignedQueue}`,
    `Escalation reason: ${portalCase.escalationReason}`,
    `Evidence: ${portalCase.evidence.join(', ')}`,
    'Safety checklist:',
    ...portalCase.safetyChecklist.map((item) => `- ${item}`),
  ];

  if (counsellorBrief?.handoffSummary) {
    lines.push(`Handoff summary: ${counsellorBrief.handoffSummary}`);
  }

  return lines.join('\n');
}

function CrisisDeskPortal({
  portalCase,
  routeStatus,
  riskLevel,
  escalationLocked,
  counsellorBrief,
  onMarkCaseReviewed,
  onStartSafetyAssessment,
  onSimulateHumanHandoff,
}) {
  const [copyStatus, setCopyStatus] = useState('Copy Handoff Packet');
  const fallbackStatus = routeStatus === 'CHECK_IN' ? 'Monitoring' : 'No case created';
  const fallbackAction = routeStatus === 'CHECK_IN' ? 'Ask targeted follow-up questions' : 'Continue supportive intake';
  const status = portalCase?.status || fallbackStatus;
  const portalAction = portalCase?.action || fallbackAction;
  const priority = portalCase?.priority || riskLevel;
  const queue = portalCase?.assignedQueue || 'No queue assigned';
  const packetStatus = portalCase?.handoffPacket || 'No packet generated';
  const routeExplanation = portalCase?.routeExplanation || getRouteExplanation(routeStatus);
  const checklist = portalCase?.safetyChecklist || [];

  const handleCopy = async () => {
    if (!portalCase) return;

    try {
      await navigator.clipboard.writeText(buildPortalCopy(portalCase, counsellorBrief));
      setCopyStatus('Copied');
      window.setTimeout(() => setCopyStatus('Copy Handoff Packet'), 1400);
    } catch {
      setCopyStatus('Copy failed');
      window.setTimeout(() => setCopyStatus('Copy Handoff Packet'), 1400);
    }
  };

  return (
    <section className={`portal-card ${portalCase ? 'portal-card--active' : ''} portal-card--${String(priority).toLowerCase()}`} aria-label="Crisis Desk Portal">
      <header className="portal-card__header">
        <div>
          <h3>Crisis Desk Portal</h3>
          <p>Simulated for demo. No real dispatch or emergency contact occurs.</p>
        </div>
        <span className="portal-priority">{priority}</span>
      </header>

      <div className="portal-grid">
        <div>
          <span>Case ID</span>
          <strong>{portalCase?.caseId || 'Not created'}</strong>
        </div>
        <div>
          <span>Status</span>
          <strong>{status}</strong>
        </div>
        <div>
          <span>Route</span>
          <strong>{formatRouteLabel(portalCase?.route || routeStatus)}</strong>
        </div>
        <div>
          <span>Escalation Lock</span>
          <strong>{escalationLocked ? 'Active' : 'Inactive'}</strong>
        </div>
        <div>
          <span>Assigned Queue</span>
          <strong>{queue}</strong>
        </div>
        <div>
          <span>Handoff Packet</span>
          <strong>{packetStatus}</strong>
        </div>
        <div className="portal-grid__wide">
          <span>Recommended Action</span>
          <strong>{portalAction}</strong>
        </div>
      </div>

      <div className="portal-route-reason">
        <span>Why this route?</span>
        <p>{routeExplanation}</p>
      </div>

      {portalCase?.escalationReason && (
        <div className="portal-route-reason portal-route-reason--alert">
          <span>Escalation Reason</span>
          <p>{portalCase.escalationReason}</p>
        </div>
      )}

      {checklist.length > 0 && (
        <div className="portal-checklist">
          <span>Safety Checklist</span>
          {checklist.map((item) => (
            <label key={item}>
              <input type="checkbox" readOnly />
              {item}
            </label>
          ))}
        </div>
      )}

      {portalCase?.safetyAssessmentStarted && (
        <div className="portal-active-question">
          <span>First safety assessment prompt</span>
          <strong>{portalCase.activeSafetyQuestion}</strong>
        </div>
      )}

      <div className="portal-actions">
        <button type="button" onClick={onMarkCaseReviewed} disabled={!portalCase || portalCase.reviewed}>
          Mark Reviewed
        </button>
        <button type="button" onClick={onStartSafetyAssessment} disabled={!portalCase}>
          Start Safety Assessment
        </button>
        <button type="button" onClick={handleCopy} disabled={!portalCase}>
          {copyStatus}
        </button>
        <button type="button" onClick={onSimulateHumanHandoff} disabled={!portalCase || portalCase.handoffSimulated}>
          Simulate Human Handoff
        </button>
      </div>

      <p className="portal-disclaimer">
        Prototype demo only. Not a diagnosis or replacement for emergency care. In real deployment, escalation would follow the organization&apos;s trained crisis-support protocol.
      </p>
    </section>
  );
}

export default function AgentDashboard({
  agentStatuses = DEFAULT_STATUSES,
  phqScore = 0,
  gadScore = 0,
  riskLevel = 'MINIMAL',
  systemMode = 'LISTENING',
  detectedEvidence = [],
  routeStatus = 'Monitoring natural conversation',
  escalationLocked = false,
  activityLog = [],
  isEscalated = false,
  counsellorBrief = null,
  portalCase = null,
  onMarkCaseReviewed,
  onStartSafetyAssessment,
  onSimulateHumanHandoff,
  onResetSession,
  isJudgeDemoMode = false,
  onToggleJudgeDemo,
  demoSteps = [],
  demoStepIndex = 0,
  isDemoBusy = false,
  onDemoStepClick,
  sessionResetKey = 0,
}) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    setElapsedSeconds(0);
  }, [sessionResetKey]);

  useEffect(() => {
    const timerId = window.setInterval(() => {
      setElapsedSeconds((currentSeconds) => currentSeconds + 1);
    }, 1000);

    return () => window.clearInterval(timerId);
  }, []);

  const mergedStatuses = {
    ...DEFAULT_STATUSES,
    ...agentStatuses,
  };

  const visibleLog = useMemo(() => activityLog.slice(0, 12), [activityLog]);
  const safePhqScore = clampScore(phqScore, 27);
  const safeGadScore = clampScore(gadScore, 21);
  const riskColor = getRiskColor(riskLevel);
  const systemModeCopy = getSystemModeCopy(systemMode);
  const currentDemoStep = demoSteps[Math.min(demoStepIndex, Math.max(demoSteps.length - 1, 0))];
  const demoProgressLabel = currentDemoStep
    ? `Step ${Math.min(demoStepIndex + 1, demoSteps.length)}/${demoSteps.length} ${currentDemoStep.label}`
    : 'Demo sequence ready';

  return (
    <aside className={`agent-dashboard ${isEscalated ? 'agent-dashboard--escalated' : ''}`}>
      <header className="dashboard-header">
        <div>
          <h2>Agent Orchestration</h2>
          <p>Autonomous · Real-time · Silent</p>
        </div>
        <div className="dashboard-actions">
          <time className="session-timer" aria-label="Session timer">
            {formatElapsedTime(elapsedSeconds)}
          </time>
          <button
            className={`judge-demo-toggle ${isJudgeDemoMode ? 'judge-demo-toggle--active' : ''}`}
            type="button"
            onClick={onToggleJudgeDemo}
            aria-pressed={isJudgeDemoMode}
          >
            Judge Demo
          </button>
          <button className="reset-session-button" type="button" onClick={onResetSession}>
            Reset
          </button>
        </div>
      </header>

      {isJudgeDemoMode && (
        <section className="judge-demo-panel" aria-label="Judge demo mode">
          <div className="judge-demo-panel__header">
            <span>Guided Demo Mode</span>
            <strong>{demoProgressLabel}</strong>
          </div>
          <div className="judge-demo-steps">
            {demoSteps.map((step, index) => {
              const isDone = index < demoStepIndex;
              const isActive = index === demoStepIndex;

              return (
                <button
                  className={`judge-demo-chip ${isDone ? 'judge-demo-chip--done' : ''} ${isActive ? 'judge-demo-chip--active' : ''}`}
                  type="button"
                  key={step.message}
                  onClick={() => onDemoStepClick?.(index)}
                  disabled={!isActive || isDemoBusy}
                >
                  <span>{index + 1}</span>
                  {step.message}
                </button>
              );
            })}
          </div>
        </section>
      )}

      {isEscalated && (
        <div className="escalation-banner" role="alert">
          <strong>Urgent safety signal detected.</strong>
          <span>
            Manas locked escalation and prepared a counsellor handoff brief. In real deployment, this would trigger the organization's crisis-support protocol.
          </span>
        </div>
      )}

      <section className={`system-mode-card system-mode-card--${systemMode.toLowerCase().replace('_', '-')}`}>
        <div>
          <span>System Mode</span>
          <strong>{systemModeCopy.label}</strong>
          <p>{systemModeCopy.detail}</p>
        </div>
        <div className="route-chip">
          {formatRouteStatus(routeStatus)}
        </div>
      </section>

      <section className="decision-strip" aria-label="Current triage decision">
        <div>
          <span>Risk Level</span>
          <strong className={getRiskBadgeClass(riskLevel)}>{riskLevel}</strong>
        </div>
        <div>
          <span>Current Route</span>
          <strong>{formatRouteLabel(routeStatus)}</strong>
        </div>
        <div className={escalationLocked ? 'decision-strip__locked' : ''}>
          <span>Escalation Lock</span>
          <strong>{escalationLocked ? 'LOCKED' : 'OPEN'}</strong>
        </div>
      </section>

      <CrisisDeskPortal
        portalCase={portalCase}
        routeStatus={routeStatus}
        riskLevel={riskLevel}
        escalationLocked={escalationLocked}
        counsellorBrief={counsellorBrief}
        onMarkCaseReviewed={onMarkCaseReviewed}
        onStartSafetyAssessment={onStartSafetyAssessment}
        onSimulateHumanHandoff={onSimulateHumanHandoff}
      />

      <section className="agent-grid" aria-label="Agent statuses">
        {AGENTS.map((agent) => (
          <AgentNode
            key={agent.id}
            name={agent.name}
            hindiName={agent.hindiName}
            meaning={agent.meaning}
            status={mergedStatuses[agent.id]}
          />
        ))}
      </section>

      <section className="score-section" aria-label="Clinical score monitor">
        <div className="score-section__header">
          <h3>Signal Tracking</h3>
          <span>Demo signal tracking, not diagnosis.</span>
        </div>

        <ScoreBar
          label="PHQ-9"
          score={safePhqScore}
          maxScore={27}
          color={getPhqColor(safePhqScore)}
        />
        <ScoreBar
          label="GAD-7"
          score={safeGadScore}
          maxScore={21}
          color={getGadColor(safeGadScore)}
        />

        <div className="risk-panel">
          <span>Triage Risk Level</span>
          <strong style={{ color: riskColor }}>{riskLevel}</strong>
        </div>
      </section>

      <section className="evidence-section" aria-label="Detected evidence and route status">
        <div className="evidence-header">
          <h3>Detected Evidence</h3>
          <span>{detectedEvidence.length} signals</span>
        </div>

        {detectedEvidence.length === 0 ? (
          <div className="evidence-empty">
            No risk evidence detected yet. Conversation remains in listening mode.
          </div>
        ) : (
          <div className="evidence-list">
            {detectedEvidence.slice(0, 5).map((item) => (
              <div className="evidence-item" key={item.id}>
                <strong>{item.label}</strong>
                <span>{item.source}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="activity-section" aria-label="Agent activity log">
        <div className="activity-header">
          <h3>Agent Log</h3>
          <span className="live-indicator">
            <span aria-hidden="true" />
            Live
          </span>
        </div>

        <div className="activity-log">
          {visibleLog.length === 0 ? (
            <div className="activity-log__empty">
              Awaiting first user message...
            </div>
          ) : (
            visibleLog.map((entry) => (
              <div className={`activity-entry activity-entry--${entry.severity || 'info'}`} key={entry.id}>
                <time>{formatLogTime(entry.timestamp)}</time>
                {entry.agent ? (
                  <div className="activity-entry__content">
                    <div>
                      <strong>{entry.agent}</strong>
                      <span>{entry.action}</span>
                    </div>
                    {entry.detail && <p>{entry.detail}</p>}
                  </div>
                ) : (
                  <p>{entry.message}</p>
                )}
              </div>
            ))
          )}
        </div>
      </section>

      {counsellorBrief && <CounsellorBrief brief={counsellorBrief} />}
    </aside>
  );
}

export { AgentNode, CounsellorBrief };
