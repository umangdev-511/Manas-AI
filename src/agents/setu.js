const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
const MODEL = 'gpt-4o';

const SYSTEM_PROMPT = `
You are Setu, the counsellor briefing agent for Manas.
Generate a concise English JSON object for a mental health counsellor.
This is clinical decision support only, not a diagnosis.

Return only valid JSON with this shape:
{
  "severityBadge": "MODERATE-SEVERE",
  "phq9Score": 16,
  "gad7Score": 11,
  "riskLevel": "High",
  "keyTriggers": ["social isolation"],
  "conversationSummary": ["User expressed..."],
  "recommendedOpener": "I can see...",
  "escalationReason": "PHQ-9 score exceeded threshold (16/27)",
  "sessionDuration": "2 minutes",
  "timestamp": "2026-05-26T10:00:00.000Z"
}
`;

function hasUsableApiKey() {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
  return apiKey && apiKey !== 'placeholder' && apiKey !== 'your_key_here';
}

function parseJsonObject(text) {
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('Setu response did not contain JSON');
    return JSON.parse(match[0]);
  }
}

function createFallbackBrief({
  conversationHistory,
  phqScore,
  gadScore,
  riskLevel,
  triggeredKeywords = [],
  escalationReason,
  sessionStartedAt,
}) {
  const userMessages = conversationHistory
    .filter((message) => message.role === 'user')
    .map((message) => message.content);

  const elapsedMinutes = Math.max(
    1,
    Math.round((Date.now() - new Date(sessionStartedAt).getTime()) / 60000),
  );

  return {
    severityBadge: riskLevel,
    phq9Score: phqScore,
    gad7Score: gadScore,
    riskLevel: riskLevel === 'SEVERE' ? 'Critical' : 'High',
    keyTriggers: triggeredKeywords.length ? triggeredKeywords : ['threshold exceeded'],
    conversationSummary: userMessages.slice(-3).map((content) => `User shared: ${content}`),
    recommendedOpener: 'I can see you have been carrying a lot lately. I am here with you, and I have time to listen.',
    escalationReason,
    sessionDuration: `${elapsedMinutes} minute${elapsedMinutes === 1 ? '' : 's'}`,
    timestamp: new Date().toISOString(),
  };
}

export async function generateCounsellorBrief({
  conversationHistory,
  phqScore,
  gadScore,
  riskLevel,
  triggeredKeywords = [],
  escalationReason,
  sessionStartedAt,
}) {
  const fallbackBrief = createFallbackBrief({
    conversationHistory,
    phqScore,
    gadScore,
    riskLevel,
    triggeredKeywords,
    escalationReason,
    sessionStartedAt,
  });

  if (!hasUsableApiKey()) {
    return fallbackBrief;
  }

  const response = await fetch(OPENAI_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${import.meta.env.VITE_OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: JSON.stringify({
            conversationHistory,
            phqScore,
            gadScore,
            riskLevel,
            triggeredKeywords,
            escalationReason,
            sessionStartedAt,
            timestamp: new Date().toISOString(),
          }),
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`Setu API request failed: ${response.status}`);
  }

  const data = await response.json();
  const brief = parseJsonObject(data.choices?.[0]?.message?.content || '{}');

  return {
    ...fallbackBrief,
    ...brief,
    phq9Score: phqScore,
    gad7Score: gadScore,
    escalationReason,
    timestamp: brief.timestamp || new Date().toISOString(),
  };
}
