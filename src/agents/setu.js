function createDeterministicBrief({
  conversationHistory = [],
  phqScore = 0,
  gadScore = 0,
  riskLevel = 'CRITICAL',
  triggeredKeywords = [],
  escalationReason = 'Urgent escalation route selected by triage engine',
  sessionStartedAt,
}) {
  const userMessages = conversationHistory
    .filter((message) => message.role === 'user')
    .map((message) => message.content);
  const elapsedMinutes = sessionStartedAt
    ? Math.max(1, Math.round((Date.now() - new Date(sessionStartedAt).getTime()) / 60000))
    : 1;

  return {
    severityBadge: riskLevel,
    phq9Score: phqScore,
    gad7Score: gadScore,
    riskLevel: riskLevel === 'CRITICAL' ? 'Critical' : 'High',
    keyTriggers: triggeredKeywords.length ? triggeredKeywords : ['urgent escalation route'],
    conversationSummary: userMessages.slice(-4).map((content) => `User shared: ${content}`),
    recommendedOpener: 'I can see you have been carrying a lot. I am here with you now, and we can take this one step at a time.',
    escalationReason,
    sessionDuration: `${elapsedMinutes} minute${elapsedMinutes === 1 ? '' : 's'}`,
    timestamp: new Date().toISOString(),
  };
}

export async function generateCounsellorBrief(input) {
  console.log('[Setu] Deterministic counsellor brief generated');
  return createDeterministicBrief(input);
}
