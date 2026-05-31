const SUNNA_MODES = {
  DYNAMIC_EMPATHY: 'DYNAMIC_EMPATHY',
  GUIDED_TRIAGE: 'GUIDED_TRIAGE',
  SAFETY_LOCKED: 'SAFETY_LOCKED',
};

const RESPONSE_TYPES = {
  EMOTIONAL_SUPPORT: 'emotional_support',
  TRIAGE_QUESTION: 'triage_question',
  SELF_HARM_CHECK: 'self_harm_check',
  CRISIS_ESCALATION: 'crisis_escalation',
};

const SUNNA_SYSTEM_PROMPT = `
You are Sunna, the user-facing listener in Manas.
Manas is autonomous mental-health triage and counsellor handoff infrastructure. Sunna is not a therapist, doctor, diagnosis tool, emergency service, or motivational chatbot.

Core behavior:
- Always acknowledge the specific emotion, image, or fact the user just gave.
- Never answer with generic support unless it is tied to what the user said.
- Mirror the user's energy. If they are slow and heavy, be slow and grounded.
- Reference earlier conversation naturally when it matters.
- Ask questions like a caring human, not a checklist.
- Ask at most one question.
- Short user responses get short Sunna responses.
- If the previous Sunna message asked a question and the user gives a short answer, respond with a statement first. Add one question only when it feels natural.
- Do not diagnose or use clinical labels with the user.
- Do not claim real emergency help was contacted.

Never use these phrases:
"absolutely", "certainly", "of course", "I understand", "that must be hard", "I am sorry to hear that".

Good response examples:
- "Two weeks of not sleeping - that is its own kind of exhaustion. What does a normal day look like for you right now?"
- "Losing interest in things you used to love is one of the hardest parts. When did you last feel even a little like yourself?"
- "That feeling of nothing mattering - is it everything, or are there moments where it lifts even slightly?"
- "The not sleeping and feeling alone together can make the day feel unreal. Do those two feel connected for you?"
- "That is a lot to hold quietly. Have thoughts of harming yourself come up?"

Bad response examples:
- "I understand how you feel."
- "That must be really hard for you."
- "I am here to support you."
- "Thank you for sharing that with me."
- "It sounds like you are going through a difficult time."
`;

const CRISIS_RESPONSE = 'I am really concerned about your safety right now, and this moment is urgent; I am glad you told me instead of carrying this alone. We do not need to solve everything - we only need to keep you safe for this next minute. Please move away from anything you could use to hurt yourself and try to stay near another person if possible; are you alone right now?';

const PATTERNS = {
  crisis: /(suicide|suicidal|want to die|end my life|kill myself|don't want to live|no point living|can't go on|better off dead)/i,
  trustedPerson: /\b(friend|mother|father|mom|dad|sister|brother|cousin|partner|teacher|roommate|neighbour|neighbor)\b/i,
  actionRequest: /(what should i do|what can i do|help me|tell me what to do|yes|ok|okay)/i,
  eating: /(can't eat|cannot eat|not able to eat|unable to eat|no appetite|haven't eaten|have not eaten|not eating)/i,
  illness: /(sick|unwell|ill|fever|body pain|not feeling well|physically)/i,
  sleep: /(can't sleep|cannot sleep|not slept|slept|insomnia|sleep|tired|tiring|exhausted|no energy|fatigue|drained)/i,
  anhedonia: /(nothing interests|nothing excites|lost interest|losing interest|no interest|don't enjoy|cannot enjoy|feel like myself)/i,
  anxiety: /(anxious|anxiety|worried|worry|nervous|panic|panicking|out of control|overwhelmed|scared|fear)/i,
  academic: /(exam|marks|result|fail|failed|study|studies|college|school|career|placement|rank)/i,
  isolation: /(alone|lonely|isolated|no one|withdrawn|no one to share)/i,
  hopeless: /(hopeless|worthless|useless|no hope|nothing matters|burden|failure|do not see the point|don't see the point|no point anymore)/i,
  lowMood: /(low|sad|down|depressed|not okay|empty|numb)/i,
  affirmative: /^(yes|yeah|yep|haan|ha|ok|okay|i have|i do)$/i,
  negative: /^(no|nope|not really|i don't|i do not)$/i,
  uncertain: /^(maybe|kind of|i guess|a little|sort of)$/i,
  unknown: /^(i don't know|i do not know|idk|don't know|not sure)$/i,
  oneWordFeeling: /^(tired|sad|fine|okay|empty|alone|scared|angry|numb)$/i,
  hindi: /[\u0900-\u097F]/,
  hinglish: /\b(haan|nahi|nhi|darr|akela|akeli|thak|pareshan|tension|zindagi|marna|jeena|dost|ghar)\b/i,
};

function normalize(text = '') {
  return text.trim().toLowerCase();
}

function getLanguageMode(userMessage, override) {
  if (override) return override;
  if (PATTERNS.hindi.test(userMessage)) return 'hindi';
  if (PATTERNS.hinglish.test(userMessage)) return 'hinglish';
  return 'english';
}

function deterministicIndex(seed, max) {
  if (max <= 1) return 0;

  const text = String(seed || '');
  let hash = 0;
  for (let index = 0; index < text.length; index += 1) {
    hash = (hash * 31 + text.charCodeAt(index)) % 1000003;
  }

  return hash % max;
}

function pick(seed, responses) {
  return responses[deterministicIndex(seed, responses.length)];
}

function getPreviousManasMessage(conversationHistory) {
  return [...conversationHistory]
    .slice(0, -1)
    .reverse()
    .find((message) => message.role === 'manas')?.content || '';
}

function getEvidenceCategories(detectedEvidence = []) {
  return detectedEvidence.map((item) => item.category || '').filter(Boolean);
}

function hasEvidence(context, category) {
  return getEvidenceCategories(context.detectedEvidence).includes(category);
}

function hasCurrentEvidence(context, category) {
  return getEvidenceCategories(context.currentEvidence).includes(category);
}

function getUserMessages(conversationHistory) {
  return conversationHistory.filter((message) => message.role === 'user').map((message) => message.content);
}

function hasEarlierSignal(conversationHistory, pattern) {
  return getUserMessages(conversationHistory).slice(0, -1).some((message) => pattern.test(message));
}

function getConversationMemory(conversationHistory, context = {}) {
  const categories = getEvidenceCategories(context.detectedEvidence);

  return {
    sleep: categories.includes('sleep_disturbance') || categories.includes('fatigue') || hasEarlierSignal(conversationHistory, PATTERNS.sleep),
    loneliness: categories.includes('isolation') || hasEarlierSignal(conversationHistory, PATTERNS.isolation),
    anhedonia: categories.includes('loss_of_interest') || hasEarlierSignal(conversationHistory, PATTERNS.anhedonia),
    hopelessness: categories.includes('hopelessness') || hasEarlierSignal(conversationHistory, PATTERNS.hopeless),
    worthlessness: categories.includes('worthlessness') || hasEarlierSignal(conversationHistory, /worthless|useless|burden/i),
  };
}

function inferRiskLevel(userMessage, context = {}) {
  if (context.escalationLocked || context.riskLevel === 'CRITICAL' || PATTERNS.crisis.test(userMessage)) {
    return 'CRITICAL';
  }

  if (
    context.riskLevel === 'HIGH'
    || hasEvidence(context, 'hopelessness')
    || hasEvidence(context, 'worthlessness')
    || hasEvidence(context, 'self_harm_ideation')
    || PATTERNS.hopeless.test(userMessage)
  ) {
    return 'HIGH';
  }

  if (
    context.riskLevel === 'MODERATE'
    || hasEvidence(context, 'isolation')
    || hasEvidence(context, 'fatigue')
    || hasEvidence(context, 'sleep_disturbance')
    || hasEvidence(context, 'loss_of_interest')
    || hasEvidence(context, 'anxiety')
    || hasEvidence(context, 'worry')
    || hasEvidence(context, 'panic')
    || hasEvidence(context, 'fear')
    || hasEvidence(context, 'loss_of_control')
    || PATTERNS.isolation.test(userMessage)
    || PATTERNS.sleep.test(userMessage)
    || PATTERNS.anhedonia.test(userMessage)
    || PATTERNS.anxiety.test(userMessage)
  ) {
    return 'MODERATE';
  }

  return 'LOW';
}

function getSunnaMode(riskLevel, escalationLocked) {
  if (escalationLocked || riskLevel === 'HIGH' || riskLevel === 'CRITICAL') return SUNNA_MODES.SAFETY_LOCKED;
  if (riskLevel === 'MODERATE') return SUNNA_MODES.GUIDED_TRIAGE;
  return SUNNA_MODES.DYNAMIC_EMPATHY;
}

function getResponseType({ mode, riskLevel, userMessage }) {
  if (riskLevel === 'CRITICAL' || PATTERNS.crisis.test(userMessage)) return RESPONSE_TYPES.CRISIS_ESCALATION;
  if (riskLevel === 'HIGH') return RESPONSE_TYPES.SELF_HARM_CHECK;
  if (mode === SUNNA_MODES.GUIDED_TRIAGE) return RESPONSE_TYPES.TRIAGE_QUESTION;
  return RESPONSE_TYPES.EMOTIONAL_SUPPORT;
}

function getContextualResponse(userMessage, previousManasMessage, riskLevel) {
  const normalizedMessage = normalize(userMessage);
  const previous = normalize(previousManasMessage);

  if (PATTERNS.affirmative.test(normalizedMessage)) {
    if (previous.includes('thoughts of harming yourself')) {
      return 'That yes matters. I am going to treat thoughts of harming yourself as important, not something to brush aside. Are these thoughts present right now?';
    }

    if (previous.includes('are you alone right now')) {
      return 'I am still concerned because this is urgent and you are alone. Please move away from anything you could use to hurt yourself, then call someone trusted and keep them on the phone. Who can you contact right now?';
    }

    if (previous.includes('sleep, appetite, studies, or daily routine')) {
      return 'Yeah. When mood and energy start touching daily routine, it stops being a small thing. Which part has changed the most: sleep, appetite, studies, or routine?';
    }

    if (previous.includes('panic wave')) {
      return 'That sounds like it is rising sharply right now. Keep your body still for a few seconds and name where you are. Is there any immediate physical danger around you?';
    }

    if (previous.includes('emotionally alone') || previous.includes('safe person nearby')) {
      return 'Yeah. That kind of alone can be hard to explain to people, especially when you have been holding it in for a while. How long has it been feeling this way?';
    }
  }

  if (PATTERNS.negative.test(normalizedMessage)) {
    if (previous.includes('thoughts of harming yourself')) {
      return 'No is important too. I will not push that further, but the hopeless feeling still deserves care.';
    }

    if (previous.includes('are you alone right now')) {
      return 'That is important to know. Please stay near that person or in a shared space for now.';
    }

    return 'No is okay. We can leave it there for a moment.';
  }

  if (PATTERNS.unknown.test(normalizedMessage)) {
    if (riskLevel === 'HIGH') {
      return 'Not knowing is okay; sometimes the mind goes blank when pain gets too heavy. I still want to stay careful with any thought of harm.';
    }

    return 'I do not know is sometimes the most honest thing a person can say. You do not have to force clarity right now.';
  }

  if (PATTERNS.uncertain.test(normalizedMessage)) {
    return 'Maybe is okay. You do not have to be sure about any of this yet.';
  }

  if (PATTERNS.oneWordFeeling.test(normalizedMessage)) {
    if (normalizedMessage === 'tired') {
      return 'Tired like you need sleep, or tired like something deeper than that?';
    }

    if (normalizedMessage === 'fine' || normalizedMessage === 'okay') {
      return 'Fine can mean many things. I will not force more out of it.';
    }

    if (normalizedMessage === 'empty' || normalizedMessage === 'numb') {
      return 'Empty has its own weight. Sometimes it says more than a long explanation.';
    }

    return `${userMessage.trim()} can be the whole story for a moment. We can stay with just that.`;
  }

  if (previous.includes('emotionally alone') || previous.includes('safe person nearby')) {
    if (/emotionally|emotion|inside|understood|share/i.test(userMessage)) {
      return 'That sounds like emotional loneliness - being around people may not be the same as feeling understood. I am glad you named it. Is there anyone who feels even slightly safer to message today?';
    }

    if (/no safe|nearby|nobody|alone|no one/i.test(userMessage)) {
      return 'Not having a safe person nearby can make this feel much heavier. For now, it helps to identify the least unsafe option rather than the perfect one. Is there anyone you could call, message, or physically move closer to?';
    }
  }

  if (riskLevel === 'CRITICAL' && PATTERNS.trustedPerson.test(userMessage)) {
    return 'That is a good next move. Send something simple like: "I am not safe alone right now. Can you call me or come sit with me?" Please move away from anything you could use to hurt yourself while you contact them. Are you able to call or message them now?';
  }

  if (riskLevel === 'CRITICAL' && PATTERNS.actionRequest.test(userMessage)) {
    return 'Let us keep this very practical for the next minute: move away from anything dangerous, contact one trusted person, and stay where another person can reach you. If you feel you might act on the thought, contact local emergency support now. Are you alone right now?';
  }

  return '';
}

function getLowResponse(userMessage, languageMode, conversationHistory = [], context = {}) {
  const memory = getConversationMemory(conversationHistory, context);

  if (languageMode === 'hindi') {
    return 'Main sun raha hoon. Jo bhi chal raha hai, use seedhe shabdon mein kehna theek hai. Aaj sabse zyada bhaari kya lag raha hai?';
  }

  if (languageMode === 'hinglish') {
    return 'Main sun raha hoon. Lagta hai kuch andar se heavy ho raha hai, aur yahan bolna bilkul theek hai. Aaj sabse zyada heavy kya lag raha hai?';
  }

  if (PATTERNS.academic.test(userMessage)) {
    return 'One result or one difficult phase does not define the whole story of your life. Still, I can hear how heavy it feels right now. What is hurting more today - fear of failure, pressure from others, or disappointment in yourself?';
  }

  if (memory.sleep && memory.loneliness) {
    return 'The not sleeping and feeling alone together can make the day feel unreal. Do those two feel connected for you?';
  }

  if (/\bempty\b|\bnumb\b/i.test(userMessage)) {
    return 'Empty can feel quiet from the outside and heavy from the inside. When did that empty feeling start showing up?';
  }

  if (PATTERNS.lowMood.test(userMessage)) {
    return pick(userMessage, [
      'That sounds heavy - like you have been moving through the day with less strength than usual. I am glad you said it here. What has felt most difficult to carry today?',
      'I hear a quiet tiredness in that. You do not have to make it sound bigger for it to matter. When did this low feeling start becoming noticeable?',
      'That sounds like the kind of low mood that can slowly drain the day. I am glad you named it. Has anything changed recently in your routine or support around you?',
    ]);
  }

  return pick(`${userMessage}-${conversationHistory.length}`, [
    'I am listening. It feels like something has been building inside you for a while. What part of this has felt the heaviest today?',
    'You put that down in very few words, but it still has weight. What feels most important for me to know first?',
    'I may not have enough context yet, but I am here with you. What are you hoping Manas should help you think through right now?',
  ]);
}

function getModerateResponse(userMessage, context, conversationHistory = []) {
  const memory = getConversationMemory(conversationHistory, context);

  if (hasCurrentEvidence(context, 'isolation') || PATTERNS.isolation.test(userMessage)) {
    if (memory.sleep) {
      return 'The poor sleep and the loneliness together can make everything feel more distant. Do those feel connected for you?';
    }

    return pick(`${userMessage}-${conversationHistory.length}`, [
      'That kind of loneliness can become very heavy, especially when everything stays inside. I am here with you in this moment. When you say there is no one to share with, do you mean you feel emotionally alone, or that there is no safe person nearby right now?',
      'Not having someone to share with can make the weight feel bigger than it already is. I am glad you said it here. Is there one person who feels even slightly safer than the others?',
    ]);
  }

  if (hasCurrentEvidence(context, 'loss_of_interest') || PATTERNS.anhedonia.test(userMessage)) {
    return pick(`${userMessage}-${conversationHistory.length}`, [
      'Losing interest in things that used to matter can feel like a quiet kind of grief. When did you last feel even a little like yourself?',
      'That empty feeling, where nothing really pulls you toward it, can be deeply tiring. Does it feel numb, sad, or more like everything is far away?',
    ]);
  }

  if (hasCurrentEvidence(context, 'worry') || /\bworry|\bworried|\bworrying|\bcan't stop thinking|\bcannot stop thinking/i.test(userMessage)) {
    return 'The worrying sounds like it is taking up too much room in your head. Does it come in waves, or is it there almost all day?';
  }

  if (hasCurrentEvidence(context, 'loss_of_control') || /\bout of control|\boverwhelmed|\blosing control|\bcan't control|\bcannot control/i.test(userMessage)) {
    return 'Feeling out of control can make even small things feel unsafe. Is there something specific that seems to trigger that feeling?';
  }

  if (hasCurrentEvidence(context, 'fear') || /\bafraid|\bfear|\bscared/i.test(userMessage)) {
    return 'Being scared all the time can keep your body on alert even when you are trying to rest. Is the fear tied to one situation, or does it follow you everywhere?';
  }

  if (hasCurrentEvidence(context, 'anxiety') || hasCurrentEvidence(context, 'panic') || PATTERNS.anxiety.test(userMessage)) {
    return 'That sounds frightening - like your body is sounding an alarm and you are trying hard to stay in control. Are you in immediate physical danger, or does this feel like a panic wave rising right now?';
  }

  if (hasCurrentEvidence(context, 'fatigue') || hasCurrentEvidence(context, 'sleep_disturbance') || PATTERNS.sleep.test(userMessage)) {
    return pick(`${userMessage}-${conversationHistory.length}`, [
      'Weeks of not sleeping - that is its own kind of exhaustion. What does a normal day look like for you right now?',
      'That sounds exhausting - like you have been trying to keep going while carrying something heavy inside. Has this started affecting your sleep, appetite, studies, or daily routine?',
      'When tiredness and low mood start showing up together, it can make the whole day feel harder. I am glad you named it. Has this been going on for days, weeks, or longer?',
    ]);
  }

  if (PATTERNS.eating.test(userMessage)) {
    return 'That can feel frightening and draining, especially when your body is already low on energy. I am glad you said it instead of hiding it. When was the last time you were able to eat or drink anything?';
  }

  if (PATTERNS.illness.test(userMessage)) {
    return 'Feeling physically unwell on top of emotional stress can make everything harder to hold. It makes sense to name that here. Is there someone nearby or a doctor you can contact if the physical symptoms get worse?';
  }

  return 'I can hear that this is affecting more than just one moment. It is okay to say it plainly here. Has this started affecting your sleep, appetite, routine, studies, work, or support around you?';
}

function getHighResponse(userMessage, context, conversationHistory = []) {
  if (PATTERNS.crisis.test(userMessage) || context.riskLevel === 'CRITICAL' || context.escalationLocked) {
    return CRISIS_RESPONSE;
  }

  const memory = getConversationMemory(conversationHistory, context);

  if (/\bdo not see the point\b|\bdon't see the point\b|\bnothing matters\b|\bno point anymore\b/i.test(userMessage)) {
    return 'That feeling of not seeing the point can become a very dark place to sit alone with. Have thoughts of harming yourself come up?';
  }

  if (/\bburden\b|\bworthless\b|\buseless\b/i.test(userMessage)) {
    return 'Hearing you describe yourself that way worries me, because that kind of self-blame can get dangerous when it stays private. Have thoughts of harming yourself come up?';
  }

  if (hasCurrentEvidence(context, 'loss_of_interest') || PATTERNS.anhedonia.test(userMessage)) {
    if (memory.sleep) {
      return 'The not sleeping and now losing interest are stacking up in a serious way. Have thoughts of harming yourself come up?';
    }

    return 'Losing interest in everything can make life feel strangely distant. Have thoughts of harming yourself come up?';
  }

  if (memory.sleep || memory.loneliness || memory.anhedonia) {
    const earlierSignals = [
      memory.sleep ? 'the not sleeping' : '',
      memory.anhedonia ? 'the loss of interest' : '',
      memory.loneliness ? 'the loneliness' : '',
    ].filter(Boolean);
    const earlierSignalText = earlierSignals.length > 1
      ? `${earlierSignals.slice(0, -1).join(', ')} and ${earlierSignals[earlierSignals.length - 1]}`
      : earlierSignals[0];

    return `With ${earlierSignalText} already in the room, this loss of interest matters. Have thoughts of harming yourself come up?`;
  }

  return pick(`${userMessage}-${conversationHistory.length}`, [
    'I am really sorry it has reached a point where you are seeing yourself this way. Your pain matters even if your mind is telling you that you do not. Have you had thoughts of harming yourself?',
    'I am taking that seriously. Feeling hopeless or worthless can become very heavy when it stays inside. Have thoughts of hurting yourself come up at any point?',
    'I am glad you said this instead of carrying it silently. I do not want to give you empty motivation here. Have you had thoughts of harming yourself?',
  ]);
}

function buildFallback({ mode, riskLevel, userMessage, context, languageMode, conversationHistory }) {
  if (riskLevel === 'CRITICAL' || context.escalationLocked) {
    return {
      text: CRISIS_RESPONSE,
      mode: SUNNA_MODES.SAFETY_LOCKED,
      responseType: RESPONSE_TYPES.CRISIS_ESCALATION,
    };
  }

  if (riskLevel === 'HIGH') {
    return {
      text: getHighResponse(userMessage, context, conversationHistory),
      mode: SUNNA_MODES.SAFETY_LOCKED,
      responseType: RESPONSE_TYPES.SELF_HARM_CHECK,
    };
  }

  if (mode === SUNNA_MODES.GUIDED_TRIAGE) {
    return {
      text: getModerateResponse(userMessage, context, conversationHistory),
      mode,
      responseType: RESPONSE_TYPES.TRIAGE_QUESTION,
    };
  }

  return {
    text: getLowResponse(userMessage, languageMode, conversationHistory, context),
    mode,
    responseType: RESPONSE_TYPES.EMOTIONAL_SUPPORT,
  };
}

function validateSunnaResponse(text, { riskLevel, responseType }) {
  const normalizedText = normalize(text);
  const questionCount = (text.match(/\?/g) || []).length;
  const blockedPatterns = [
    /everything will be okay/i,
    /just be positive/i,
    /think about your parents/i,
    /absolutely/i,
    /certainly/i,
    /of course/i,
    /i understand/i,
    /that must be hard/i,
    /i am sorry to hear that/i,
    /thank you for sharing/i,
    /i am here to support you/i,
    /difficult time/i,
    /you have depression/i,
    /you are diagnosed/i,
    /i am a therapist/i,
    /i am a doctor/i,
    /emergency services have been contacted/i,
    /help has been contacted/i,
  ];

  if (!text || text.split(/\s+/).length > 85) return false;
  if (blockedPatterns.some((pattern) => pattern.test(text))) return false;
  if (questionCount > 1) return false;

  if (riskLevel === 'CRITICAL') {
    return (
      normalizedText.includes('concerned')
      && normalizedText.includes('urgent')
      && normalizedText.includes('move away')
      && normalizedText.includes('hurt yourself')
      && normalizedText.includes('alone')
    );
  }

  if (riskLevel === 'HIGH' || responseType === RESPONSE_TYPES.SELF_HARM_CHECK) {
    return normalizedText.includes('harm') || normalizedText.includes('hurt');
  }

  return questionCount <= 1;
}

function getGuardedSunnaResponse(userMessage, conversationHistory = [], context = {}) {
  const riskLevel = inferRiskLevel(userMessage, context);
  const mode = getSunnaMode(riskLevel, context.escalationLocked);
  const responseType = getResponseType({ mode, riskLevel, userMessage });
  const languageMode = getLanguageMode(userMessage, context.languageMode);
  const previousManasMessage = getPreviousManasMessage(conversationHistory);
  const contextualText = getContextualResponse(userMessage, previousManasMessage, riskLevel);
  const generated = contextualText
    ? { text: contextualText, mode, responseType }
    : buildFallback({ mode, riskLevel, userMessage, context, languageMode, conversationHistory });
  const safetyPassed = validateSunnaResponse(generated.text, {
    riskLevel,
    responseType: generated.responseType,
  });

  if (safetyPassed) {
    return {
      ...generated,
      safetyPassed: true,
    };
  }

  const fallback = buildFallback({ mode, riskLevel, userMessage, context, languageMode, conversationHistory });

  return {
    ...fallback,
    safetyPassed: validateSunnaResponse(fallback.text, {
      riskLevel,
      responseType: fallback.responseType,
    }),
  };
}

export async function getSunnaResponse(conversationHistory, context = {}) {
  const latestUserMessage = [...conversationHistory].reverse().find((message) => message.role === 'user');
  const result = getGuardedSunnaResponse(latestUserMessage?.content || '', conversationHistory, context);

  return {
    content: result.text,
    text: result.text,
    mode: result.mode,
    responseType: result.responseType,
    safetyPassed: result.safetyPassed,
    usedFallback: false,
    errorMessage: '',
  };
}

export { SUNNA_MODES, RESPONSE_TYPES };
