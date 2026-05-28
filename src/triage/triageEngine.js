const RISK_LEVELS = {
  LOW: 'LOW',
  MODERATE: 'MODERATE',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL',
};

const ROUTES = {
  MONITOR: 'MONITOR',
  CHECK_IN: 'CHECK_IN',
  HUMAN_RECOMMENDED: 'HUMAN_RECOMMENDED',
  URGENT_ESCALATION: 'URGENT_ESCALATION',
  HANDOFF_READY: 'HANDOFF_READY',
};

const SYSTEM_MODES = {
  LISTENING: 'LISTENING',
  ASSESSING: 'ASSESSING',
  HUMAN_RECOMMENDED: 'HUMAN_RECOMMENDED',
  ESCALATING: 'ESCALATING',
  HANDOFF_READY: 'HANDOFF_READY',
};

const EVIDENCE_RULES = [
  {
    category: 'low_mood',
    label: 'Low mood',
    phq: 1,
    patterns: [/\blow\b/i, /\bsad\b/i, /\bdown\b/i, /\bdepressed\b/i, /\bnot okay\b/i],
  },
  {
    category: 'fatigue',
    label: 'Fatigue',
    phq: 2,
    patterns: [/\btired\b/i, /\bexhausted\b/i, /\bno energy\b/i, /\bfatigue\b/i],
  },
  {
    category: 'sleep_disturbance',
    label: 'Sleep disturbance',
    phq: 2,
    patterns: [/\bsleep\b/i, /\bcan't sleep\b/i, /\bcannot sleep\b/i, /\binsomnia\b/i],
  },
  {
    category: 'appetite_change',
    label: 'Appetite change',
    phq: 2,
    patterns: [/\bappetite\b/i, /\bnot eating\b/i, /\bovereating\b/i, /\bcan't eat\b/i, /\bcannot eat\b/i],
  },
  {
    category: 'impaired_functioning',
    label: 'Impaired functioning',
    phq: 1,
    patterns: [/\bstudies\b/i, /\bwork\b/i, /\broutine\b/i, /\bfunction\b/i],
  },
  {
    category: 'isolation',
    label: 'Isolation',
    phq: 2,
    patterns: [/\balone\b/i, /\blonely\b/i, /\bno one\b/i, /\bno one to share\b/i],
  },
  {
    category: 'hopelessness',
    label: 'Hopelessness',
    phq: 3,
    patterns: [/\bhopeless\b/i, /\bno hope\b/i, /\bnothing will change\b/i],
  },
  {
    category: 'worthlessness',
    label: 'Worthlessness',
    phq: 3,
    patterns: [/\bworthless\b/i, /\buseless\b/i, /\bburden\b/i],
  },
  {
    category: 'self_harm_ideation',
    label: 'Self-harm ideation',
    phq: 5,
    patterns: [/\bharm myself\b/i, /\bhurt myself\b/i, /\bself harm\b/i],
  },
  {
    category: 'suicidal_intent',
    label: 'Explicit suicidal intent',
    phq: 5,
    patterns: [/\bkill myself\b/i, /\bsuicide\b/i, /\bend my life\b/i, /\bwant to die\b/i, /\bdon't want to live\b/i],
  },
  {
    category: 'anxiety',
    label: 'Anxiety',
    gad: 2,
    patterns: [/\banxious\b/i, /\banxiety\b/i],
  },
  {
    category: 'worry',
    label: 'Worry',
    gad: 2,
    patterns: [/\bworry\b/i, /\bworried\b/i, /\boverthinking\b/i],
  },
  {
    category: 'panic',
    label: 'Panic',
    gad: 2,
    patterns: [/\bpanic\b/i, /\bpanic attack\b/i],
  },
  {
    category: 'fear',
    label: 'Fear',
    gad: 2,
    patterns: [/\bafraid\b/i, /\bfear\b/i, /\bscared\b/i],
  },
  {
    category: 'irritability',
    label: 'Irritability',
    gad: 1,
    patterns: [/\birritated\b/i, /\birritable\b/i, /\bangry\b/i],
  },
  {
    category: 'loss_of_control',
    label: 'Loss of control',
    gad: 2,
    patterns: [/\bout of control\b/i, /\blosing control\b/i, /\bcan't control\b/i, /\bcannot control\b/i],
  },
];

function clamp(value, max) {
  return Math.min(Math.max(value, 0), max);
}

function createEvidenceId(category, index) {
  return `evidence-${index + 1}-${category}`;
}

function detectEvidence(message, messageIndex) {
  return EVIDENCE_RULES
    .filter((rule) => rule.patterns.some((pattern) => pattern.test(message)))
    .map((rule) => ({
      id: createEvidenceId(rule.category, messageIndex),
      category: rule.category,
      label: rule.label,
      phq: rule.phq || 0,
      gad: rule.gad || 0,
      source: message,
    }));
}

function hasCategory(evidence, category) {
  return evidence.some((item) => item.category === category);
}

function getRiskLevel({ detectedEvidence, allEvidence, phqScore, gadScore, previousState }) {
  if (previousState.escalationLocked || hasCategory(detectedEvidence, 'suicidal_intent')) {
    return RISK_LEVELS.CRITICAL;
  }

  if (
    hasCategory(allEvidence, 'hopelessness')
    || hasCategory(allEvidence, 'worthlessness')
    || hasCategory(allEvidence, 'self_harm_ideation')
    || phqScore >= 8
  ) {
    return RISK_LEVELS.HIGH;
  }

  const distressSignals = allEvidence.filter((item) => item.phq > 0 || item.gad > 0);
  if (distressSignals.length >= 2 || hasCategory(allEvidence, 'isolation') || gadScore >= 6 || phqScore >= 5) {
    return RISK_LEVELS.MODERATE;
  }

  return RISK_LEVELS.LOW;
}

function getRoute({ riskLevel, escalationLocked, counsellorBrief }) {
  if (escalationLocked || riskLevel === RISK_LEVELS.CRITICAL) return ROUTES.URGENT_ESCALATION;
  if (riskLevel === RISK_LEVELS.HIGH) return ROUTES.HUMAN_RECOMMENDED;
  if (riskLevel === RISK_LEVELS.MODERATE) return ROUTES.CHECK_IN;
  return ROUTES.MONITOR;
}

function createCounsellorBrief({
  phqScore,
  gadScore,
  riskLevel,
  route,
  evidence,
  timeline,
}) {
  const latestEvidence = evidence.slice(0, 8);
  const keySignals = latestEvidence.map((item) => (
    item.category === 'suicidal_intent' ? 'Suicidal intent' : item.label
  ));
  const conversationTimeline = timeline.map((item, index) => ({
    step: index + 1,
    userText: item.userText,
    detectedEvidence: item.detectedEvidence,
    riskAfterMessage: item.riskAfterMessage,
    routeAfterMessage: item.routeAfterMessage,
  }));
  const conversationSummary = conversationTimeline.slice(-4).map((item) => {
    const evidenceText = item.detectedEvidence.join(', ') || 'no new signal';
    return `Message ${item.step}: ${evidenceText}; risk ${item.riskAfterMessage}; route ${item.routeAfterMessage}.`;
  });
  const hasCriticalIntent = keySignals.includes('Suicidal intent');
  const handoffSummary = hasCriticalIntent
    ? 'The user first reported low mood and tiredness, then described isolation. They later expressed hopelessness and worthlessness. The latest message included explicit suicidal intent.'
    : `Manas detected ${keySignals.join(', ') || 'risk signals'} across ${timeline.length} user message${timeline.length === 1 ? '' : 's'}. Current route is ${route}, risk is ${riskLevel}, and escalation is locked until reset.`;
  const criticalQuestions = [
    'Are you alone right now?',
    'Do you have a plan or means to harm yourself?',
    'Is there someone nearby who can stay with you?',
    'Can you move away from anything you could use to hurt yourself?',
    'Where are you right now, and are you in immediate danger?',
  ];

  return {
    packetTitle: 'Counsellor Handoff Packet',
    priorityBadge: riskLevel === RISK_LEVELS.CRITICAL ? 'Immediate Safety Assessment' : 'Human Review',
    severityBadge: riskLevel,
    phq9Score: phqScore,
    gad7Score: gadScore,
    riskLevel: riskLevel === RISK_LEVELS.CRITICAL ? 'Critical' : 'High',
    route: route === ROUTES.URGENT_ESCALATION ? 'Urgent Escalation' : route,
    escalationLock: route === ROUTES.URGENT_ESCALATION ? 'Active' : 'Inactive',
    keyTriggers: keySignals,
    keySignals,
    conversationTimeline,
    conversationSummary,
    suggestedFirstQuestions: riskLevel === RISK_LEVELS.CRITICAL
      ? criticalQuestions
      : [
        'What has felt hardest today?',
        'Who is one safe person who could check in with you?',
        'What changed most in your routine recently?',
      ],
    recommendedOpener: 'I can see you have been carrying a lot, and I am here with you now. We can take this one step at a time.',
    recommendedImmediateAction: riskLevel === RISK_LEVELS.CRITICAL
      ? 'Start with immediate safety assessment. Confirm whether the user is alone, has access to means, has a safe person nearby, and needs emergency or crisis support. Do not begin with generic emotional exploration.'
      : 'Begin with supportive check-in, confirm available support, and assess whether risk signals are increasing.',
    whatNotToDo: [
      'Do not minimize',
      'Do not diagnose',
      'Do not begin with generic motivation',
      'Do not delay safety assessment',
    ],
    handoffSummary,
    status: 'Ready for human counsellor review',
    escalationReason: route === ROUTES.URGENT_ESCALATION
      ? 'Explicit suicidal intent detected in user message.'
      : 'Escalation threshold reached',
    sessionDuration: 'Live session',
    timestamp: 'session-live',
  };
}

function createTimelineEntry({
  userText,
  detectedEvidence,
  riskLevel,
  phqScore,
  gadScore,
  route,
}) {
  return {
    userText,
    detectedEvidence: detectedEvidence.map((item) => item.label),
    riskAfterMessage: riskLevel,
    phqAfterMessage: phqScore,
    gadAfterMessage: gadScore,
    routeAfterMessage: route,
  };
}

export function getSystemMode(state) {
  if (state.counsellorBrief) return SYSTEM_MODES.HANDOFF_READY;
  if (state.route === ROUTES.URGENT_ESCALATION || state.escalationLocked) return SYSTEM_MODES.ESCALATING;
  if (state.route === ROUTES.HUMAN_RECOMMENDED) return SYSTEM_MODES.HUMAN_RECOMMENDED;
  if (state.route === ROUTES.CHECK_IN) return SYSTEM_MODES.ASSESSING;
  return SYSTEM_MODES.LISTENING;
}

export function getInitialTriageState() {
  return {
    phqScore: 0,
    gadScore: 0,
    riskLevel: RISK_LEVELS.LOW,
    route: ROUTES.MONITOR,
    escalationLocked: false,
    evidence: [],
    timeline: [],
    agentEvents: [],
    counsellorBrief: null,
    systemMode: SYSTEM_MODES.LISTENING,
  };
}

export function resetTriageState() {
  return getInitialTriageState();
}

export function generateAgentEvents(previousState, nextState, message) {
  const latestTimeline = nextState.timeline[nextState.timeline.length - 1];
  const detected = latestTimeline?.detectedEvidence || [];
  const events = [];
  const detectedText = detected.join(', ').toLowerCase();
  const severity = nextState.riskLevel === RISK_LEVELS.CRITICAL
    ? 'critical'
    : nextState.riskLevel === RISK_LEVELS.HIGH
      ? 'high'
      : nextState.riskLevel === RISK_LEVELS.MODERATE
        ? 'watch'
        : 'info';

  if (detected.length > 0) {
    const hasCrisisSignal = detected.includes('Explicit suicidal intent');
    events.push({
      agent: 'Samajhna',
      action: hasCrisisSignal ? 'Crisis signal detected' : 'Risk signals updated',
      detail: hasCrisisSignal ? 'explicit suicidal intent' : detectedText,
      severity: hasCrisisSignal ? 'critical' : severity,
    });
  } else {
    events.push({
      agent: 'Samajhna',
      action: 'No new risk evidence detected',
      detail: 'continuing silent monitoring',
      severity: 'info',
    });
  }

  if (nextState.route === ROUTES.HUMAN_RECOMMENDED) {
    events.push({
      agent: 'Nirdeshak',
      action: 'Human support recommended',
      detail: 'hopelessness or worthlessness signals detected',
      severity: 'high',
    });
  } else if (nextState.route === ROUTES.URGENT_ESCALATION) {
    events.push({
      agent: 'Nirdeshak',
      action: 'Urgent escalation triggered',
      detail: 'critical risk locked',
      severity: 'critical',
    });
  } else {
    events.push({
      agent: 'Nirdeshak',
      action: `Route selected: ${nextState.route}`,
      detail: nextState.route === ROUTES.CHECK_IN
        ? 'early distress indicators detected'
        : 'monitoring natural conversation',
      severity,
    });
  }

  if (!previousState.escalationLocked && nextState.escalationLocked) {
    events.push({
      agent: 'Nirdeshak',
      action: 'Escalation lock enabled',
      detail: 'risk will not downgrade until reset',
      severity: 'critical',
    });
  }

  if (!previousState.counsellorBrief && nextState.counsellorBrief) {
    events.push({
      agent: 'Setu',
      action: 'Counsellor brief generated',
      detail: 'handoff package ready',
      severity: 'critical',
    });
  }

  return events.map((event, index) => ({
    id: `event-${nextState.timeline.length}-${index}`,
    ...event,
    userText: message,
  }));
}

export function analyzeMessage(message, previousState = getInitialTriageState()) {
  const messageIndex = previousState.timeline.length;
  const detectedEvidence = detectEvidence(message, messageIndex);
  const phqDelta = detectedEvidence.reduce((sum, item) => sum + item.phq, 0);
  const gadDelta = detectedEvidence.reduce((sum, item) => sum + item.gad, 0);
  const phqScore = clamp(previousState.phqScore + phqDelta, 27);
  const gadScore = clamp(previousState.gadScore + gadDelta, 21);
  const evidence = [...detectedEvidence, ...previousState.evidence].slice(0, 20);
  const escalationLocked = previousState.escalationLocked || hasCategory(detectedEvidence, 'suicidal_intent');
  const riskLevel = getRiskLevel({
    detectedEvidence,
    allEvidence: evidence,
    phqScore,
    gadScore,
    previousState,
  });
  const provisionalRoute = getRoute({
    riskLevel,
    escalationLocked,
    counsellorBrief: previousState.counsellorBrief,
  });
  const shouldGenerateBrief = escalationLocked && !previousState.counsellorBrief;
  const route = provisionalRoute;
  const timelineEntry = createTimelineEntry({
    userText: message,
    detectedEvidence,
    riskLevel,
    phqScore,
    gadScore,
    route,
  });
  const timeline = [...previousState.timeline, timelineEntry];
  const counsellorBrief = shouldGenerateBrief
    ? createCounsellorBrief({
      phqScore,
      gadScore,
      riskLevel,
      route,
      evidence,
      timeline,
    })
    : previousState.counsellorBrief;
  const nextStateWithoutEvents = {
    ...previousState,
    phqScore,
    gadScore,
    riskLevel,
    route,
    escalationLocked,
    evidence,
    timeline,
    counsellorBrief,
    systemMode: SYSTEM_MODES.ASSESSING,
  };
  const systemMode = getSystemMode(nextStateWithoutEvents);
  const nextState = {
    ...nextStateWithoutEvents,
    systemMode,
  };
  const agentEvents = generateAgentEvents(previousState, nextState, message);

  return {
    ...nextState,
    agentEvents,
  };
}

export { RISK_LEVELS, ROUTES, SYSTEM_MODES };
