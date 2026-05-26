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
    MINIMAL: '#10B981',
    MILD: '#FBBF24',
    MODERATE: '#F59E0B',
    'MODERATE-SEVERE': '#EF4444',
    SEVERE: '#991B1B',
  };

  return colors[riskLevel] || '#6B7280';
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

export default function AgentDashboard({
  agentStatuses = DEFAULT_STATUSES,
  phqScore = 0,
  gadScore = 0,
  riskLevel = 'MINIMAL',
  activityLog = [],
  isEscalated = false,
  counsellorBrief = null,
  onResetSession,
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
          <button className="reset-session-button" type="button" onClick={onResetSession}>
            Reset
          </button>
        </div>
      </header>

      {isEscalated && (
        <div className="escalation-banner" role="alert">
          ⚠ ESCALATION TRIGGERED
        </div>
      )}

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
          <span>Clinical Risk Assessment</span>
          <strong style={{ color: riskColor }}>{riskLevel}</strong>
        </div>
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
              <div className="activity-entry" key={entry.id}>
                <time>{formatLogTime(entry.timestamp)}</time>
                <p>{entry.message}</p>
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
