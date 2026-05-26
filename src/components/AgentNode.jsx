import React from 'react';
import '../styles/AgentDashboard.css';

const STATUS_LABELS = {
  STANDBY: 'Standby',
  LISTENING: 'Listening',
  SCORING: 'Scoring',
  ROUTING: 'Routing',
  BRIEFING: 'Briefing',
  COMPLETE: 'Complete',
  ESCALATED: 'Escalated',
};

const ACTIVE_STATUSES = new Set(['LISTENING', 'SCORING', 'ROUTING', 'BRIEFING']);

export default function AgentNode({
  name,
  hindiName,
  meaning,
  status = 'STANDBY',
}) {
  const normalizedStatus = STATUS_LABELS[status] ? status : 'STANDBY';
  const isActive = ACTIVE_STATUSES.has(normalizedStatus);

  return (
    <article
      className={`agent-node agent-node--${normalizedStatus.toLowerCase()} ${isActive ? 'agent-node--active' : ''}`}
      title={meaning}
    >
      <div className="agent-node__identity">
        <strong>{name}</strong>
        <span>{hindiName}</span>
      </div>

      <span className={`status-badge status-badge--${normalizedStatus.toLowerCase()}`}>
        {STATUS_LABELS[normalizedStatus]}
      </span>
    </article>
  );
}
