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
- Give one small concrete next step the user can do right now.
- Then ask exactly one gentle follow-up question.
- Avoid repeating the same style of question across turns.
- Keep the response under 110 words.
- If the user mentions self-harm or wanting to die, be calm and direct:
  first ask them to move toward immediate safety and contact emergency support
  or a trusted person nearby, then ask one direct safety question.
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

function getFallbackResponse(userMessage, conversationHistory = []) {
  const crisisPattern = /(suicide|suicidal|want to die|end my life|kill myself|don't want to live|no point living|can't go on|better off dead)/i;
  const sleepPattern = /(can't sleep|cannot sleep|insomnia|sleep|tired|exhausted|no energy)/i;
  const anxietyPattern = /(anxious|anxiety|worried|worry|nervous|panic|panicking|out of control|overwhelmed|scared|fear)/i;
  const isolationPattern = /(alone|lonely|isolated|no one|withdrawn)/i;
  const hopelessPattern = /(hopeless|worthless|useless|no hope|nothing matters|failure)/i;
  const interestPattern = /(lost interest|losing interest|no interest|don't enjoy|nothing feels fun)/i;
  const userTurnCount = conversationHistory.filter((message) => message.role === 'user').length;
  const pick = (responses) => responses[userTurnCount % responses.length];

  if (crisisPattern.test(userMessage)) {
    return pick([
      'I am taking this seriously. Please move away from anything you could use to hurt yourself and contact emergency support or someone trusted nearby right now. If you can, keep your phone with you and do not stay alone. Are you somewhere physically safe at this moment?',
      'I am really sorry you are carrying this. Your safety comes first: call local emergency support or ask a trusted person to stay with you now. Put some distance between you and anything dangerous if you can. Who can you contact immediately?',
    ]);
  }

  if (anxietyPattern.test(userMessage)) {
    return pick([
      'That sounds exhausting, like your body has been on alert for too long. For the next 30 seconds, try naming five things you can see and let your shoulders drop once. What time of day does the anxious feeling usually get strongest?',
      'The worry sounds relentless. A small first step is to write the worry as one sentence, then add “I do not have to solve this in the next five minutes.” What usually starts the panicky feeling for you?',
      'Feeling out of control can be frightening. Try placing both feet on the floor and taking three slower breaths before doing anything else. What is the first sign you notice when it starts building?',
    ]);
  }

  if (sleepPattern.test(userMessage)) {
    return pick([
      'Not sleeping well can make everything feel heavier. Tonight, keep the goal small: dim the screen, drink some water, and lie down without forcing sleep. Has this been happening for a few nights, or has it been building for longer?',
      'Poor sleep can drain the whole day. Before bed, try writing the top worry on paper so it is outside your head for a while. What tends to happen when you try to rest at night?',
    ]);
  }

  if (isolationPattern.test(userMessage)) {
    return pick([
      'Feeling alone with this can make the weight much bigger. One small step is to send a simple message to one safe person: “I am having a hard day, can you check in?” Who feels least difficult to contact?',
      'Not having someone to share this with is painful. For now, choose one low-pressure connection, even a short text or sitting near someone at home. When did you start feeling this alone?',
    ]);
  }

  if (hopelessPattern.test(userMessage)) {
    return pick([
      'That is a very heavy place to be. For the next few minutes, do not try to solve your whole life; just stay with one safe action, like drinking water or sitting near someone. What has been making things feel most hopeless lately?',
      'I hear how low this feels. A useful first step is to separate the feeling from the fact: “I feel worthless” is not the same as “I am worthless.” What happened recently that made this feeling stronger?',
    ]);
  }

  if (interestPattern.test(userMessage)) {
    return pick([
      'Losing interest in things that used to matter can feel quietly frightening. Do not force enjoyment today; choose one tiny routine action, like stepping outside for two minutes. What is one thing that has started feeling different from before?',
      'When things stop feeling meaningful, it can be hard to explain. A small next step is to pick the easiest activity, not the most important one. What is something you used to care about that now feels distant?',
    ]);
  }

  return pick([
    'I am listening. You do not have to explain everything perfectly; start with the part that feels most present. Take one slow breath before answering. What feels most important for me to understand right now?',
    'Thank you for saying that here. We can take this one piece at a time; try naming the feeling in one word first. What has today felt like for you?',
    'I hear that this has not been easy to carry. Let us make it smaller for a moment: focus only on the next hour, not the whole week. What part feels hardest to put into words?',
  ]);
}

export async function getSunnaResponse(conversationHistory) {
  const latestUserMessage = [...conversationHistory].reverse().find((message) => message.role === 'user');
  const fallbackResponse = getFallbackResponse(latestUserMessage?.content || '', conversationHistory);

  if (!hasUsableSunnaApiKey()) {
    return fallbackResponse;
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
    return fallbackResponse;
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content?.trim() || fallbackResponse;
}
