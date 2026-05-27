const GEMINI_API_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';
const GEMINI_MODELS = ['gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-2.0-flash'];

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
  "timestamp": "2026-05-27T10:00:00.000Z"
}
`;

function hasUsableApiKey() {
  const apiKey = import.meta.env?.VITE_GEMINI_API_KEY;
  return apiKey && apiKey !== 'placeholder' && apiKey !== 'your_key_here';
}

function parseJsonObject(text) {
  const cleanedText = text
    .replace(/```json/gi, '')
    .replace(/```/g, '')
    .trim();

  try {
    return JSON.parse(cleanedText);
  } catch {
    const match = cleanedText.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('Setu response did not contain JSON');
    return JSON.parse(match[0]);
  }
}

function extractGeminiText(data) {
  return data.candidates?.[0]?.content?.parts
    ?.map((part) => part.text || '')
    .join('')
    .trim();
}

async function callGeminiWithFallback(apiKey, payload) {
  let lastError = null;

  for (const model of GEMINI_MODELS) {
    const response = await fetch(`${GEMINI_API_BASE_URL}/${model}:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    console.log('[Setu] Gemini brief request completed', {
      model,
      ok: response.ok,
      status: response.status,
    });

    if (response.ok) {
      return {
        model,
        data: await response.json(),
      };
    }

    lastError = {
      model,
      status: response.status,
      text: await response.text(),
    };

    console.warn('[Setu] Gemini model failed, trying next if available.', lastError);
  }

  throw new Error(`Gemini request failed with status ${lastError?.status || 'unknown'} on ${lastError?.model || 'all models'}.`);
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
  const apiKey = import.meta.env?.VITE_GEMINI_API_KEY;

  console.log('[Setu] Brief generation requested', {
    hasGeminiApiKey: Boolean(hasUsableApiKey()),
    phqScore,
    gadScore,
    riskLevel,
  });

  if (!hasUsableApiKey()) {
    console.log('[Setu] No usable VITE_GEMINI_API_KEY. Returning fallback brief.');
    return fallbackBrief;
  }

  const prompt = `${SYSTEM_PROMPT}\n\nInput:\n${JSON.stringify({
    conversationHistory,
    phqScore,
    gadScore,
    riskLevel,
    triggeredKeywords,
    escalationReason,
    sessionStartedAt,
    timestamp: new Date().toISOString(),
  })}`;

  try {
    const result = await callGeminiWithFallback(apiKey, {
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 420,
        responseMimeType: 'application/json',
      },
    });
    const responseText = extractGeminiText(result.data);
    const brief = parseJsonObject(responseText || '{}');

    console.log('[Setu] Brief JSON ready', {
      model: result.model,
    });

    return {
      ...fallbackBrief,
      ...brief,
      phq9Score: phqScore,
      gad7Score: gadScore,
      escalationReason,
      timestamp: brief.timestamp || new Date().toISOString(),
    };
  } catch (error) {
    console.warn('[Setu] Gemini failed. Returning fallback brief.', error);
    return fallbackBrief;
  }
}
