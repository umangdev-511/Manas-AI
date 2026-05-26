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

export function hasUsableSunnaApiKey() {
  const apiKey = import.meta.env?.VITE_OPENAI_API_KEY;
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
  const sleepPattern = /(can't sleep|cannot sleep|insomnia|sleep|tired|exhausted|no energy)/i;
  const anxietyPattern = /(anxious|anxiety|worried|worry|nervous|panic|panicking|out of control|overwhelmed|scared|fear)/i;
  const isolationPattern = /(alone|lonely|isolated|no one|withdrawn)/i;
  const hopelessPattern = /(hopeless|worthless|useless|no hope|nothing matters|failure)/i;
  const interestPattern = /(lost interest|losing interest|no interest|don't enjoy|nothing feels fun)/i;

  if (crisisPattern.test(userMessage)) {
    return 'I am really sorry you are carrying this right now. Your safety matters in this moment, and it would be important to reach out to emergency support or someone you trust nearby. Are you somewhere safe right now?';
  }

  if (anxietyPattern.test(userMessage)) {
    return 'That sounds exhausting, like your mind and body have been on alert for too long. I am here with you while we slow this down a little. When does the anxious feeling usually get strongest?';
  }

  if (sleepPattern.test(userMessage)) {
    return 'Not sleeping well can make everything feel heavier and harder to hold. I am sorry you have been going through that. Has this been happening for a few nights, or has it been building for longer?';
  }

  if (isolationPattern.test(userMessage)) {
    return 'Feeling alone with this can be really painful. I am glad you said it here instead of keeping it all inside. Is there anyone in your day-to-day life who knows even a little of what you are carrying?';
  }

  if (hopelessPattern.test(userMessage)) {
    return 'Hearing that you feel this low matters, and I do not want you to have to sit with it by yourself. I am here with you right now. What has been making things feel most hopeless lately?';
  }

  if (interestPattern.test(userMessage)) {
    return 'Losing interest in things that used to matter can feel quietly frightening. I am sorry it has been like that. What is one thing that has started feeling different from before?';
  }

  return 'I am listening. It sounds like there is a lot under the surface, and you do not have to explain it perfectly. What feels most important for me to understand right now?';
}

export async function getSunnaResponse(conversationHistory) {
  const latestUserMessage = [...conversationHistory].reverse().find((message) => message.role === 'user');

  if (!hasUsableSunnaApiKey()) {
    return getFallbackResponse(latestUserMessage?.content || '');
  }

  const response = await fetch(OPENAI_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${import.meta.env?.VITE_OPENAI_API_KEY}`,
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
