import React from 'react';
import '../styles/AgentDashboard.css';

function formatBriefTimestamp(timestamp) {
  if (!timestamp || timestamp === 'session-live') return 'Live session';

  const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
  if (Number.isNaN(date.getTime())) return 'Live session';

  return date.toLocaleString([], {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: 'short',
  });
}

function ListBlock({ title, items = [], ordered = false }) {
  if (!items.length) return null;

  const ListTag = ordered ? 'ol' : 'ul';

  return (
    <div className="brief-block">
      <h4>{title}</h4>
      <ListTag className="brief-list">
        {items.map((item) => (
          <li key={typeof item === 'string' ? item : JSON.stringify(item)}>
            {item}
          </li>
        ))}
      </ListTag>
    </div>
  );
}

export default function CounsellorBrief({ brief = {} }) {
  const {
    priorityBadge = 'HANDOFF READY',
    severityBadge = 'PENDING',
    phq9Score = 0,
    gad7Score = 0,
    riskLevel = 'Pending',
    keySignals = brief.keyTriggers || [],
    conversationTimeline = [],
    conversationSummary = [],
    suggestedFirstQuestions = [],
    recommendedImmediateAction = '',
    whatNotToDo = [],
    handoffSummary = '',
    escalationReason = '',
    timestamp,
    isPending = false,
  } = brief;
  const timelineItems = conversationTimeline.length
    ? conversationTimeline.map((item) => (
      `Message ${item.step}: ${item.detectedEvidence.join(', ') || 'no signal'} -> ${item.riskAfterMessage} / ${item.routeAfterMessage}`
    ))
    : conversationSummary;

  return (
    <section className="brief-card" aria-label="Counsellor brief">
      <header className="brief-card__header">
        <div>
          <h3>Setu Counsellor Brief</h3>
          <time>{formatBriefTimestamp(timestamp)}</time>
        </div>
        <div className="brief-priority-stack">
          <span className="priority-pill">{priorityBadge}</span>
          <span className={`severity-pill severity-pill--${String(severityBadge).toLowerCase().replace(/\s+/g, '-')}`}>
            {isPending ? 'GENERATING' : severityBadge}
          </span>
        </div>
      </header>

      <div className="brief-scores brief-scores--three">
        <div>
          <span>Risk Level</span>
          <strong>{riskLevel}</strong>
        </div>
        <div>
          <span>PHQ-style</span>
          <strong>{phq9Score} / 27</strong>
        </div>
        <div>
          <span>GAD-style</span>
          <strong>{gad7Score} / 21</strong>
        </div>
      </div>

      {escalationReason && (
        <div className="brief-alert">
          <span>Escalation Reason</span>
          <strong>{escalationReason}</strong>
        </div>
      )}

      {keySignals.length > 0 && (
        <div className="brief-block">
          <h4>Key Signals Detected</h4>
          <div className="trigger-list">
            {keySignals.map((signal) => (
              <span className="trigger-chip" key={signal}>
                {signal}
              </span>
            ))}
          </div>
        </div>
      )}

      <ListBlock title="Conversation Timeline" items={timelineItems} ordered />
      <ListBlock title="Suggested First Questions" items={suggestedFirstQuestions} ordered />

      {recommendedImmediateAction && (
        <div className="brief-block">
          <h4>Recommended Immediate Action</h4>
          <blockquote>{recommendedImmediateAction}</blockquote>
        </div>
      )}

      <ListBlock title="What Not To Do" items={whatNotToDo} />

      {handoffSummary && (
        <div className="brief-block">
          <h4>Handoff Summary</h4>
          <p className="handoff-summary">{handoffSummary}</p>
        </div>
      )}

      <p className="brief-disclaimer">
        AI-generated triage summary. For clinical decision support only. Not a diagnosis.
      </p>
    </section>
  );
}
