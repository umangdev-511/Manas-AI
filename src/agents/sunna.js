const GEMINI_API_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';
const GEMINI_MODELS = ['gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-2.0-flash'];

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
- Return 2-4 complete sentences.
- Do not stop mid-sentence.
- Do not answer with only validation.
- If the user mentions self-harm or wanting to die, be calm and direct:
  first ask them to move toward immediate safety and contact emergency support
  or a trusted person nearby, then ask one direct safety question.
`;

export function hasUsableSunnaApiKey() {
  const apiKey = import.meta.env?.VITE_GEMINI_API_KEY;
  return apiKey && apiKey !== 'placeholder' && apiKey !== 'your_key_here';
}

function buildPrompt(conversationHistory) {
  const transcript = conversationHistory
    .map((message) => `${message.role === 'user' ? 'User' : 'Manas'}: ${message.content}`)
    .join('\n');

  return `${SYSTEM_PROMPT}\n\nConversation so far:\n${transcript}\n\nRespond as Sunna now.`;
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

function extractGeminiText(data) {
  return data.candidates?.[0]?.content?.parts
    ?.map((part) => part.text || '')
    .join('')
    .trim();
}

function isUsefulSunnaResponse(responseText) {
  if (!responseText) return false;
  if (responseText.length < 70) return false;
  if (!/[.!?]$/.test(responseText.trim())) return false;
  if (!responseText.includes('?')) return false;

  const actionSignals = [
    'try',
    'please',
    'take',
    'call',
    'contact',
    'write',
    'move',
    'choose',
    'name',
    'place',
    'drink',
    'sit',
    'step',
  ];
  const normalizedText = responseText.toLowerCase();

  return actionSignals.some((signal) => normalizedText.includes(signal));
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

    console.log('[Sunna] Gemini request completed', {
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

    console.warn('[Sunna] Gemini model failed, trying next if available.', lastError);
  }

  throw new Error(`Gemini request failed with status ${lastError?.status || 'unknown'} on ${lastError?.model || 'all models'}.`);
}

export async function getSunnaResponse(conversationHistory) {
  const latestUserMessage = [...conversationHistory].reverse().find((message) => message.role === 'user');
  const fallbackResponse = getFallbackResponse(latestUserMessage?.content || '', conversationHistory);
  const apiKey = import.meta.env?.VITE_GEMINI_API_KEY;

  console.log('[Sunna] Message received', {
    userMessage: latestUserMessage?.content,
    hasGeminiApiKey: Boolean(hasUsableSunnaApiKey()),
  });

  if (!hasUsableSunnaApiKey()) {
    console.log('[Sunna] No usable VITE_GEMINI_API_KEY. Returning fallback response.');
    return {
      content: fallbackResponse,
      usedFallback: true,
      errorMessage: 'No usable VITE_GEMINI_API_KEY found.',
    };
  }

  try {
    const result = await callGeminiWithFallback(apiKey, {
      contents: [
        {
          role: 'user',
          parts: [{ text: buildPrompt(conversationHistory) }],
        },
      ],
      generationConfig: {
        temperature: 0.45,
        maxOutputTokens: 240,
      },
    });
    const responseText = extractGeminiText(result.data);

    console.log('[Sunna] Response text ready', {
      model: result.model,
      usedFallback: !responseText,
    });

    if (!isUsefulSunnaResponse(responseText)) {
      console.warn('[Sunna] Gemini response failed quality guard. Returning fallback response.', {
        responseText,
      });

      return {
        content: fallbackResponse,
        usedFallback: true,
        errorMessage: 'Gemini returned an incomplete or low-detail response.',
      };
    }

    return {
      content: responseText,
      usedFallback: false,
      errorMessage: '',
    };
  } catch (error) {
    console.warn('[Sunna] Gemini failed. Returning fallback response.', error);

    return {
      content: fallbackResponse,
      usedFallback: true,
      errorMessage: error.message,
    };
  }
}
