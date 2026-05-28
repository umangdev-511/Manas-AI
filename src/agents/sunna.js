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

const CRISIS_RESPONSE = 'My friend, I am really concerned about your safety right now, and this moment is urgent. I am glad you told me instead of carrying this alone. We do not need to solve everything - we only need to keep you safe. Please move away from anything you could use to hurt yourself and try to stay near another person if possible. Are you alone right now?';

const PATTERNS = {
  crisis: /(suicide|suicidal|want to die|end my life|kill myself|don't want to live|no point living|can't go on|better off dead)/i,
  trustedPerson: /\b(friend|mother|father|mom|dad|sister|brother|cousin|partner|teacher|roommate|neighbour|neighbor)\b/i,
  actionRequest: /(what should i do|what can i do|help me|tell me what to do|yes|ok|okay)/i,
  eating: /(can't eat|cannot eat|not able to eat|unable to eat|no appetite|haven't eaten|have not eaten|not eating)/i,
  illness: /(sick|unwell|ill|fever|body pain|not feeling well|physically)/i,
  sleep: /(can't sleep|cannot sleep|insomnia|sleep|tired|tiring|exhausted|no energy|fatigue|drained)/i,
  anxiety: /(anxious|anxiety|worried|worry|nervous|panic|panicking|out of control|overwhelmed|scared|fear)/i,
  academic: /(exam|marks|result|fail|failed|study|studies|college|school|career|placement|rank)/i,
  isolation: /(alone|lonely|isolated|no one|withdrawn|no one to share)/i,
  hopeless: /(hopeless|worthless|useless|no hope|nothing matters|burden|failure)/i,
  lowMood: /(low|sad|down|depressed|not okay)/i,
  affirmative: /^(yes|yeah|yep|haan|ha|ok|okay|i have|i do|sometimes|a little|kind of)$/i,
  negative: /^(no|nope|not really|i don't|i do not)$/i,
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
    || PATTERNS.isolation.test(userMessage)
    || PATTERNS.sleep.test(userMessage)
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
      return 'Thank you for answering honestly. I am going to treat thoughts of harming yourself as important, not as something to brush aside. Are these thoughts present right now?';
    }

    if (previous.includes('are you alone right now')) {
      return 'My friend, I am still concerned because this is urgent and you are alone. Please move away from anything you could use to hurt yourself, then call someone trusted and keep them on the phone. Who can you contact right now?';
    }

    if (previous.includes('sleep, appetite, studies, or daily routine')) {
      return 'That helps me understand the impact better. When mood and energy starts affecting routine, it deserves attention. Which part has changed the most: sleep, appetite, studies, or routine?';
    }

    if (previous.includes('panic wave')) {
      return 'That sounds like it is rising sharply right now. Keep your body still for a few seconds and name where you are. Is there any immediate physical danger around you?';
    }
  }

  if (PATTERNS.negative.test(normalizedMessage)) {
    if (previous.includes('thoughts of harming yourself')) {
      return 'I am glad you answered that directly. Even if there are no self-harm thoughts, the hopeless feeling still deserves attention. What has been making that feeling strongest today?';
    }

    if (previous.includes('are you alone right now')) {
      return 'That is important to know. Please stay near that person or in a shared space for now. Can you tell them you are not feeling safe and need them close?';
    }
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

function getLowResponse(userMessage, languageMode) {
  if (languageMode === 'hindi') {
    return 'Main sun raha hoon. Jo bhi chal raha hai, use seedhe shabdon mein kehna theek hai. Aaj sabse zyada bhaari kya lag raha hai?';
  }

  if (languageMode === 'hinglish') {
    return 'Main sun raha hoon. Lagta hai kuch andar se heavy ho raha hai, aur yahan bolna bilkul theek hai. Aaj sabse zyada heavy kya lag raha hai?';
  }

  if (PATTERNS.academic.test(userMessage)) {
    return 'My friend, one result or one difficult phase does not define the whole story of your life. But I understand that it can feel very heavy right now. What is hurting more today - fear of failure, pressure from others, or disappointment in yourself?';
  }

  if (PATTERNS.lowMood.test(userMessage)) {
    return pick(userMessage, [
      'That sounds heavy - like you have been moving through the day with less strength than usual. I am glad you said it here. What has felt most difficult to carry today?',
      'I hear a quiet tiredness in that. You do not have to make it sound bigger for it to matter. When did this low feeling start becoming noticeable?',
      'That sounds like the kind of low mood that can slowly drain the day. I am glad you named it. Has anything changed recently in your routine or support around you?',
    ]);
  }

  return pick(userMessage, [
    'I am listening. It feels like something has been building inside you for a while. What part of this has felt the heaviest today?',
    'Thank you for putting that here. We can take one piece at a time. What feels most important for me to understand first?',
    'I may not have enough context yet, but I am here with you. What are you hoping Manas should help you think through right now?',
  ]);
}

function getModerateResponse(userMessage, context) {
  if (hasEvidence(context, 'isolation') || PATTERNS.isolation.test(userMessage)) {
    return pick(userMessage, [
      'That kind of loneliness can become very heavy, especially when everything stays inside. I am here with you in this moment. When you say there is no one to share with, do you mean you feel emotionally alone, or that there is no safe person nearby right now?',
      'Not having someone to share with can make the weight feel bigger than it already is. I am glad you said it here. Is there one person who feels even slightly safer than the others?',
    ]);
  }

  if (hasEvidence(context, 'anxiety') || hasEvidence(context, 'worry') || hasEvidence(context, 'panic') || PATTERNS.anxiety.test(userMessage)) {
    return 'That sounds frightening - like your body is sounding an alarm and you are trying hard to stay in control. Are you in immediate physical danger, or does this feel like a panic wave rising right now?';
  }

  if (hasEvidence(context, 'fatigue') || hasEvidence(context, 'sleep_disturbance') || PATTERNS.sleep.test(userMessage)) {
    return pick(userMessage, [
      'That sounds exhausting - like you have been trying to keep going while carrying something heavy inside. I am glad you said it here. Has this started affecting your sleep, appetite, studies, or daily routine?',
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

function getHighResponse(userMessage, context) {
  if (PATTERNS.crisis.test(userMessage) || context.riskLevel === 'CRITICAL' || context.escalationLocked) {
    return CRISIS_RESPONSE;
  }

  return pick(userMessage, [
    'My friend, I am really sorry it has reached a point where you are seeing yourself this way. Your pain matters even if your mind is telling you that you do not. Have you had thoughts of harming yourself?',
    'I am taking that seriously. Feeling hopeless or worthless can become very heavy when it stays inside. Have thoughts of hurting yourself come up at any point?',
    'I am glad you said this instead of carrying it silently. I do not want to give you empty motivation here. Have you had thoughts of harming yourself?',
  ]);
}

function buildFallback({ mode, riskLevel, userMessage, context, languageMode }) {
  if (riskLevel === 'CRITICAL' || context.escalationLocked) {
    return {
      text: CRISIS_RESPONSE,
      mode: SUNNA_MODES.SAFETY_LOCKED,
      responseType: RESPONSE_TYPES.CRISIS_ESCALATION,
    };
  }

  if (riskLevel === 'HIGH') {
    return {
      text: getHighResponse(userMessage, context),
      mode: SUNNA_MODES.SAFETY_LOCKED,
      responseType: RESPONSE_TYPES.SELF_HARM_CHECK,
    };
  }

  if (mode === SUNNA_MODES.GUIDED_TRIAGE) {
    return {
      text: getModerateResponse(userMessage, context),
      mode,
      responseType: RESPONSE_TYPES.TRIAGE_QUESTION,
    };
  }

  return {
    text: getLowResponse(userMessage, languageMode),
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

  return questionCount === 1;
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
    : buildFallback({ mode, riskLevel, userMessage, context, languageMode });
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

  const fallback = buildFallback({ mode, riskLevel, userMessage, context, languageMode });

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
