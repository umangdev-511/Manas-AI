function getDeterministicResponse(userMessage, conversationHistory = []) {
  const normalizedMessage = userMessage.toLowerCase();
  const exactDemoResponses = {
    'i have been feeling low and tired lately.': 'That sounds exhausting — like you’ve been trying to get through the day while carrying something heavy inside. I’m glad you said it here. Has this started affecting your sleep, appetite, studies, or daily routine?',
    'i have no one to share with.': 'That kind of loneliness can feel really heavy, especially when you’re holding everything in by yourself. I’m here with you right now. When you say there’s no one to share with, do you mean you feel emotionally alone, or that there’s no safe person nearby?',
    'i feel hopeless and worthless.': 'I’m really sorry it has reached a point where you’re seeing yourself that way. You don’t have to prove your pain for it to matter. Have you had thoughts of harming yourself?',
    'i want to kill myself.': 'I’m really concerned about your safety right now, and I’m going to treat this as urgent. You don’t have to handle this next minute alone. Please move away from anything you could use to hurt yourself and stay near another person if possible. Are you alone right now?',
  };
  const crisisPattern = /(suicide|suicidal|want to die|end my life|kill myself|don't want to live|no point living|can't go on|better off dead)/i;
  const trustedPersonPattern = /\b(friend|mother|father|mom|dad|sister|brother|cousin|partner|teacher|roommate|neighbour|neighbor)\b/i;
  const actionRequestPattern = /(what should i do|what can i do|help me|tell me what to do|yes|ok|okay)/i;
  const eatingPattern = /(can't eat|cannot eat|not able to eat|unable to eat|no appetite|haven't eaten|have not eaten|not eating)/i;
  const illnessPattern = /(sick|unwell|ill|fever|body pain|not feeling well|physically)/i;
  const sleepPattern = /(can't sleep|cannot sleep|insomnia|sleep|tired|tiring|exhausted|no energy|fatigue|drained)/i;
  const anxietyPattern = /(anxious|anxiety|worried|worry|nervous|panic|panicking|out of control|overwhelmed|scared|fear)/i;
  const isolationPattern = /(alone|lonely|isolated|no one|withdrawn|no one to share)/i;
  const hopelessPattern = /(hopeless|worthless|useless|no hope|nothing matters|burden|failure)/i;
  const lowMoodPattern = /(low|sad|down|depressed|not okay)/i;
  const userTurnCount = conversationHistory.filter((message) => message.role === 'user').length;
  const earlierCrisis = conversationHistory
    .filter((message) => message.role === 'user')
    .slice(0, -1)
    .some((message) => crisisPattern.test(message.content));
  const pick = (responses) => responses[userTurnCount % responses.length];

  if (exactDemoResponses[normalizedMessage]) {
    return exactDemoResponses[normalizedMessage];
  }

  if (earlierCrisis && trustedPersonPattern.test(userMessage)) {
    return 'That is a good next move. Send something simple like: "I am not safe alone right now. Can you call me or come sit with me?" Please move away from anything you could use to hurt yourself while you contact them. Are you able to call or message them now?';
  }

  if (earlierCrisis && actionRequestPattern.test(userMessage)) {
    return 'Let us keep this very practical for the next minute: move away from anything dangerous, contact one trusted person, and stay where another person can reach you. If you feel you might act on the thought, contact local emergency support now. Are you alone right now?';
  }

  if (crisisPattern.test(userMessage)) {
    return 'I’m really concerned about your safety right now, and I’m going to treat this as urgent. You don’t have to handle this next minute alone. Please move away from anything you could use to hurt yourself and stay near another person if possible. Are you alone right now?';
  }

  if (eatingPattern.test(userMessage)) {
    return 'That can feel frightening and draining, especially when your body is already low on energy. I’m glad you said it instead of forcing yourself to hide it. When was the last time you were able to eat or drink anything?';
  }

  if (illnessPattern.test(userMessage)) {
    return 'Feeling physically unwell on top of emotional stress can make everything harder to hold. It makes sense to name that here. Is there someone nearby or a doctor you can contact if the physical symptoms get worse?';
  }

  if (anxietyPattern.test(userMessage)) {
    return 'That sounds terrifying — like your body is sounding an alarm even if you’re trying to stay in control. Does this feel like immediate physical danger, or more like a panic wave rising right now?';
  }

  if (sleepPattern.test(userMessage)) {
    return pick([
      'That sounds exhausting — like your body is asking for rest but your mind is not letting you fully land. I’m glad you named it. Has this started affecting your appetite, studies, work, or daily routine?',
      'Poor sleep can make even small things feel much heavier. It is okay that you are bringing it up here. Has this been happening for a few nights, or has it been building for longer?',
    ]);
  }

  if (isolationPattern.test(userMessage)) {
    return 'That kind of loneliness can feel really heavy, especially when you’re holding everything in by yourself. I’m here with you right now. When you say there’s no one to share with, do you mean you feel emotionally alone, or that there’s no safe person nearby?';
  }

  if (hopelessPattern.test(userMessage)) {
    return 'I’m really sorry it has reached a point where you’re seeing yourself that way. You don’t have to prove your pain for it to matter. Have you had thoughts of harming yourself?';
  }

  if (lowMoodPattern.test(userMessage)) {
    return 'That sounds exhausting — like you’ve been trying to get through the day while carrying something heavy inside. I’m glad you said it here. Has this started affecting your sleep, appetite, studies, or daily routine?';
  }

  return 'I’m listening. It sounds like something has been building up inside for a while. What part of this has felt the hardest today?';
}

export async function getSunnaResponse(conversationHistory) {
  const latestUserMessage = [...conversationHistory].reverse().find((message) => message.role === 'user');
  const content = getDeterministicResponse(latestUserMessage?.content || '', conversationHistory);

  console.log('[Sunna] Deterministic intake response generated', {
    userMessage: latestUserMessage?.content,
  });

  return {
    content,
    usedFallback: false,
    errorMessage: '',
  };
}
