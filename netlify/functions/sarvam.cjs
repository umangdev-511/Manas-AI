const SARVAM_API_BASE = 'https://api.sarvam.ai';

function json(statusCode, payload) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
    body: JSON.stringify(payload),
  };
}

function decodeJsonBody(event) {
  const rawBody = event.isBase64Encoded
    ? Buffer.from(event.body || '', 'base64').toString('utf8')
    : event.body || '{}';
  return JSON.parse(rawBody);
}

const SUNNA_PROMPT = `You are Sunna, the calm and compassionate voice-facing listener in Manas, a mental-health intake and counsellor-handoff system.

Write the next spoken response in English. The app translates it afterward when needed.
- Respond to the specific situation and concrete details in the latest message. Use relevant earlier context naturally.
- Sound gentle, unhurried, and emotionally steady when read aloud. Never sound cheerful, dramatic, clinical, or scripted.
- Use this flow: (1) name the specific weight or conflict you heard, (2) offer one small safe action the person could try now, (3) ask one choice-based question that helps them decide the next step.
- Make the action achievable in under ten minutes. Examples: choose one tiny task, write one sentence, drink water, move to a quieter/shared space, send a simple message to one trusted person, or name what needs attention first.
- Tailor the action to the situation. Do not give a breathing exercise for every problem, and do not force advice when the user mainly needs to be heard.
- Give options rather than commands. Use phrases such as "we could", "would it feel manageable", or "you might try".
- Use 28 to 55 words and ask at most one useful question.
- Do not diagnose, prescribe, calculate scores, or claim emergency help was contacted.
- Never say: "I understand", "that must be hard", "thank you for sharing", "I am here to support you", "stay positive", "everything will be okay", "calm down", "just relax", or "set those thoughts aside".
- Do not minimize the problem, promise an outcome, lecture, overwhelm the user with steps, or repeat their words back mechanically.
- Do not use more than one suggestion in a reply.
- Return only the words to speak, with no labels or markdown.`;

exports.handler = async function handler(event) {
  const apiKey = process.env.SARVAM_API_KEY;
  if (!apiKey) return json(500, { error: 'SARVAM_API_KEY is not configured.' });

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      },
      body: '',
    };
  }

  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed.' });

  const action = event.queryStringParameters?.action;
  const isStt = action === 'stt';
  const isTts = action === 'tts';
  const isTranslate = action === 'translate';
  const isReply = action === 'reply';
  if (!isStt && !isTts && !isTranslate && !isReply) return json(400, { error: 'Unknown Sarvam action.' });

  if (isReply) {
    try {
      const input = decodeJsonBody(event);
      if (['HIGH', 'CRITICAL'].includes(input.riskLevel) || input.escalationLocked) {
        return json(409, { error: 'Deterministic safety response required.' });
      }

      const history = Array.isArray(input.messages) ? input.messages.slice(-8) : [];
      const messages = [
        { role: 'system', content: SUNNA_PROMPT },
        {
          role: 'system',
          content: `Current safety context: risk=${input.riskLevel || 'LOW'}, route=${input.route || 'MONITOR'}, detected signals=${(input.evidence || []).join(', ') || 'none'}.`,
        },
        ...history.map((message) => ({
          role: message.role === 'manas' ? 'assistant' : 'user',
          content: String(message.content || '').slice(0, 1200),
        })),
      ];
      const upstream = await fetch(`${SARVAM_API_BASE}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'api-subscription-key': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'sarvam-105b-conversations',
          messages,
          temperature: 0.35,
          max_tokens: 180,
          reasoning_effort: null,
        }),
      });
      return {
        statusCode: upstream.status,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: await upstream.text(),
      };
    } catch (error) {
      return json(502, { error: `Could not generate a contextual reply: ${error.message}` });
    }
  }

  const upstreamPath = isStt ? '/speech-to-text' : isTts ? '/text-to-speech' : '/translate';
  const upstreamUrl = `${SARVAM_API_BASE}${upstreamPath}`;
  const headers = {
    'api-subscription-key': apiKey,
    'Content-Type': event.headers['content-type'] || event.headers['Content-Type'] || 'application/json',
  };
  const body = event.isBase64Encoded ? Buffer.from(event.body || '', 'base64') : event.body;

  try {
    const upstream = await fetch(upstreamUrl, { method: 'POST', headers, body });
    const responseText = await upstream.text();

    return {
      statusCode: upstream.status,
      headers: {
        'Content-Type': upstream.headers.get('content-type') || 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: responseText,
    };
  } catch (error) {
    return json(502, { error: `Could not reach Sarvam: ${error.message}` });
  }
};
