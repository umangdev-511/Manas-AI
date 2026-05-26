const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
const MODEL = 'gpt-4o';

const SYSTEM_PROMPT = `
You are Sunna, the listening agent for Manas.
Manas is not therapy and does not diagnose. Your job is to respond warmly,
briefly, and in plain English to someone sharing emotional distress.

Rules:
- Never diagnose.
- Do not use clinical labels with the user.
- Do not mention PHQ-9, GAD-7, scores, routing, escalation, or agents.
- Validate the feeling in gentle human language.
- Ask exactly one gentle follow-up question.
- Keep the response under 90 words.
- If the user mentions self-harm or wanting to die, be calm and direct:
  encourage immediate local emergency support or a trusted person, while still
  asking one gentle question.
`;

function hasUsableApiKey() {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
  return apiKey && apiKey !== 'placeholder' && apiKey !== 'your_key_here';
}

function buildMessages(conversationHistory) {
  return conversationHistory.map((message) => ({
    role: message.role === 'user' ? 'user' : 'assistant',
    content: message.content,
  }));
}

function getFallbackResponse(userMessage) {
  const crisisPattern = /(suicide|suicidal|want to die|end my life|kill myself|don't want to live|no point living|can't go on|better off dead)/i;

  if (crisisPattern.test(userMessage)) {
    return 'I am really sorry you are carrying this right now. Your safety matters in this moment, and it would be important to reach out to emergency support or someone you trust nearby. Are you somewhere safe right now?';
  }

  return 'I am really sorry it has been feeling this heavy. I am here with you, and you do not have to make sense of everything all at once. What has been the hardest part of today?';
}

export async function getSunnaResponse(conversationHistory) {
  const latestUserMessage = [...conversationHistory].reverse().find((message) => message.role === 'user');

  if (!hasUsableApiKey()) {
    return getFallbackResponse(latestUserMessage?.content || '');
  }

  const response = await fetch(OPENAI_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${import.meta.env.VITE_OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0.7,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        ...buildMessages(conversationHistory),
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`Sunna API request failed: ${response.status}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content?.trim() || getFallbackResponse(latestUserMessage?.content || '');
}
