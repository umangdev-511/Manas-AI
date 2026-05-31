import React, { useMemo, useState } from 'react';
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
  const [copyStatus, setCopyStatus] = useState('Copy Brief');
  const {
    packetTitle = 'Counsellor Handoff Packet',
    priorityBadge = 'HANDOFF READY',
    severityBadge = 'PENDING',
    phq9Score = 0,
    gad7Score = 0,
    riskLevel = 'Pending',
    route = '',
    escalationLock = '',
    keySignals = brief.keyTriggers || [],
    conversationTimeline = [],
    conversationSummary = [],
    recommendedOpener = '',
    suggestedFirstQuestions = [],
    recommendedImmediateAction = '',
    whatNotToDo = [],
    handoffSummary = '',
    status = 'Ready for human counsellor review',
    escalationReason = '',
    timestamp,
    isPending = false,
  } = brief;
  const timelineItems = conversationTimeline.length
    ? conversationTimeline.map((item) => (
      `Message ${item.step}: ${item.detectedEvidence.join(', ') || 'no signal'} -> ${item.riskAfterMessage} / ${item.routeAfterMessage}`
    ))
    : conversationSummary;
  const briefText = useMemo(() => [
    `Priority: ${priorityBadge}`,
    route && `Route: ${route}`,
    escalationLock && `Escalation Lock: ${escalationLock}`,
    `Risk: ${riskLevel}`,
    `Escalation reason: ${escalationReason}`,
    `Scores: PHQ-style ${phq9Score}/27, GAD-style ${gad7Score}/21`,
    `Key signals: ${keySignals.join(', ')}`,
    'Timeline:',
    ...timelineItems.map((item) => `- ${item}`),
    'Conversation summary:',
    ...conversationSummary.slice(0, 3).map((item) => `- ${item}`),
    recommendedOpener && `Recommended opener: ${recommendedOpener}`,
    'Suggested first questions:',
    ...suggestedFirstQuestions.map((item, index) => `${index + 1}. ${item}`),
    `Recommended immediate action: ${recommendedImmediateAction}`,
    `What not to do: ${whatNotToDo.join('; ')}`,
    `Handoff summary: ${handoffSummary}`,
    `Status: ${status}`,
  ].filter(Boolean).join('\n'), [
    priorityBadge,
    riskLevel,
    route,
    escalationLock,
    escalationReason,
    phq9Score,
    gad7Score,
    keySignals,
    timelineItems,
    conversationSummary,
    recommendedOpener,
    suggestedFirstQuestions,
    recommendedImmediateAction,
    whatNotToDo,
    handoffSummary,
    status,
  ]);

  const handleCopyBrief = async () => {
    try {
      await navigator.clipboard.writeText(briefText);
      setCopyStatus('Copied');
      window.setTimeout(() => setCopyStatus('Copy Brief'), 1400);
    } catch {
      setCopyStatus('Copy failed');
      window.setTimeout(() => setCopyStatus('Copy Brief'), 1400);
    }
  };

  return (
    <section className="brief-card" aria-label="Counsellor brief">
      <header className="brief-card__header">
        <div>
          <h3>{packetTitle}</h3>
          <time>{formatBriefTimestamp(timestamp)}</time>
        </div>
        <div className="brief-priority-stack">
          <span className="priority-pill">{priorityBadge}</span>
          <span className={`severity-pill severity-pill--${String(severityBadge).toLowerCase().replace(/\s+/g, '-')}`}>
            {isPending ? 'GENERATING' : severityBadge}
          </span>
          <button className="copy-brief-button" type="button" onClick={handleCopyBrief}>
            {copyStatus}
          </button>
        </div>
      </header>

      <div className="brief-scores brief-scores--three">
        <div>
          <span>Priority</span>
          <strong>{priorityBadge}</strong>
        </div>
        <div>
          <span>Route</span>
          <strong>{route || 'Pending'}</strong>
        </div>
        <div>
          <span>Escalation Lock</span>
          <strong>{escalationLock || 'Inactive'}</strong>
        </div>
      </div>

      <div className="brief-scores brief-scores--three brief-scores--compact">
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

      <ListBlock title="Conversation Summary" items={conversationSummary.slice(0, 3)} />

      {recommendedOpener && (
        <div className="brief-block">
          <h4>Recommended Opener</h4>
          <blockquote>{recommendedOpener}</blockquote>
        </div>
      )}

      {handoffSummary && (
        <div className="brief-block">
          <h4>Handoff Summary</h4>
          <p className="handoff-summary">{handoffSummary}</p>
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

      <ListBlock title="Do Not" items={whatNotToDo} />

      <div className="brief-status">
        <span>Status</span>
        <strong>{status}</strong>
      </div>

      <p className="brief-disclaimer">
        AI-generated triage summary. For clinical decision support only. Not a diagnosis.
      </p>
    </section>
  );
}
