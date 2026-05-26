import React from 'react';
import '../styles/AgentDashboard.css';

function formatBriefTimestamp(timestamp) {
  if (!timestamp) return 'Just now';

  const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
  if (Number.isNaN(date.getTime())) return 'Just now';

  return date.toLocaleString([], {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: 'short',
  });
}

export default function CounsellorBrief({ brief = {} }) {
  const {
    severityBadge = 'PENDING',
    phq9Score = 0,
    gad7Score = 0,
    keyTriggers = [],
    conversationSummary = [],
    recommendedOpener = '',
    escalationReason = '',
    timestamp,
    isPending = false,
  } = brief;

  return (
    <section className="brief-card" aria-label="Counsellor brief">
      <header className="brief-card__header">
        <div>
          <h3>Counsellor Brief</h3>
          <time>{formatBriefTimestamp(timestamp)}</time>
        </div>
        <span className={`severity-pill severity-pill--${String(severityBadge).toLowerCase().replace(/\s+/g, '-')}`}>
          {isPending ? 'GENERATING' : severityBadge}
        </span>
      </header>

      <div className="brief-scores">
        <div>
          <span>PHQ-9</span>
          <strong>{phq9Score} / 27</strong>
        </div>
        <div>
          <span>GAD-7</span>
          <strong>{gad7Score} / 21</strong>
        </div>
      </div>

      {keyTriggers.length > 0 && (
        <div className="brief-block">
          <h4>Key Triggers</h4>
          <div className="trigger-list">
            {keyTriggers.map((trigger) => (
              <span className="trigger-chip" key={trigger}>
                {trigger}
              </span>
            ))}
          </div>
        </div>
      )}

      {conversationSummary.length > 0 && (
        <div className="brief-block">
          <h4>Conversation Summary</h4>
          <ul className="summary-list">
            {conversationSummary.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      )}

      {recommendedOpener && (
        <div className="brief-block">
          <h4>Recommended Opener</h4>
          <blockquote>{recommendedOpener}</blockquote>
        </div>
      )}

      {escalationReason && (
        <p className="escalation-reason">
          {escalationReason}
        </p>
      )}

      <p className="brief-disclaimer">
        AI-generated triage summary. For clinical decision support only. Not a diagnosis.
      </p>
    </section>
  );
}
