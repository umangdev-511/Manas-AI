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
  EMERGENCY_PROTOCOL_RECOMMENDED: 'EMERGENCY_PROTOCOL_RECOMMENDED',
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
    patterns: [/\bsleep\b/i, /\bslept\b/i, /\bnot slept\b/i, /\bcan't sleep\b/i, /\bcannot sleep\b/i, /\binsomnia\b/i],
  },
  {
    category: 'loss_of_interest',
    label: 'Loss of interest',
    phq: 2,
    patterns: [/\bnothing excites\b/i, /\blost interest\b/i, /\blosing interest\b/i, /\bno interest\b/i, /\bdon't enjoy\b/i, /\bcannot enjoy\b/i],
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
    patterns: [/\bhopeless\b/i, /\bno hope\b/i, /\bnothing will change\b/i, /\bdo not see the point\b/i, /\bdon't see the point\b/i, /\bno point anymore\b/i],
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
    patterns: [/\bharm myself\b/i, /\bharming myself\b/i, /\bhurt myself\b/i, /\bself harm\b/i],
  },
  {
    category: 'suicidal_intent',
    label: 'Explicit suicidal intent',
    phq: 5,
    patterns: [/\bkill myself\b/i, /\bsuicide\b/i, /\bend my life\b/i, /\bwant to die\b/i, /\bdon't want to live\b/i],
  },
  {
    category: 'immediate_danger',
    label: 'Immediate danger indicators',
    phq: 5,
    patterns: [
      /\bpills?\b/i,
      /\bknife\b/i,
      /\bblade\b/i,
      /\brope\b/i,
      /\bpoison\b/i,
      /\broof\b/i,
      /\bbridge\b/i,
      /\btrain track\b/i,
      /\brailway track\b/i,
      /\babout to do it\b/i,
      /\bdoing it now\b/i,
      /\bi have it with me\b/i,
      /\bi am going to do it now\b/i,
      /\bgoli\b/i,
      /\bzeher\b/i,
      /\bchaku\b/i,
      /\brassi\b/i,
      /\bchhat\b/i,
      /\bpul\b/i,
      /\babhi kar raha\b/i,
      /\bmere paas hai\b/i,
    ],
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

function getContextualMessage(message, context = {}) {
  const normalizedMessage = message.trim().toLowerCase();
  const previousAssistantMessage = (context.previousAssistantMessage || '').toLowerCase();
  const affirmativePattern = /^(yes|yeah|yep|haan|ha|ok|okay|i have|i do|sometimes|a little|kind of)$/i;
  const negativePattern = /^(no|nope|not really|i don't|i do not)$/i;

  if (affirmativePattern.test(normalizedMessage)) {
    if (previousAssistantMessage.includes('thoughts of harming yourself')) {
      return 'yes I have had thoughts of harm myself';
    }

    if (previousAssistantMessage.includes('are you alone right now')) {
      return 'yes I am alone right now';
    }

    if (previousAssistantMessage.includes('safe person nearby')) {
      return 'yes there is no safe person nearby and I feel alone';
    }

    if (previousAssistantMessage.includes('sleep, appetite, studies, or daily routine')) {
      return 'yes it is affecting my sleep appetite studies and routine';
    }

    if (previousAssistantMessage.includes('panic wave')) {
      return 'yes this feels like panic and fear';
    }
  }

  if (negativePattern.test(normalizedMessage)) {
    if (previousAssistantMessage.includes('are you alone right now')) {
      return 'no I am not alone right now';
    }

    if (previousAssistantMessage.includes('thoughts of harming yourself')) {
      return 'no current risk signal';
    }
  }

  return message;
}

function hasCategory(evidence, category) {
  return evidence.some((item) => item.category === category);
}

function getRiskLevel({ detectedEvidence, allEvidence, phqScore, gadScore, previousState }) {
  if (
    previousState.escalationLocked
    || hasCategory(detectedEvidence, 'suicidal_intent')
    || hasCategory(detectedEvidence, 'immediate_danger')
  ) {
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
  if (counsellorBrief?.priorityBadge === 'Emergency Protocol Recommended') return ROUTES.EMERGENCY_PROTOCOL_RECOMMENDED;
  if (escalationLocked || riskLevel === RISK_LEVELS.CRITICAL) return ROUTES.URGENT_ESCALATION;
  if (riskLevel === RISK_LEVELS.HIGH) return ROUTES.HUMAN_RECOMMENDED;
  if (riskLevel === RISK_LEVELS.MODERATE) return ROUTES.CHECK_IN;
  return ROUTES.MONITOR;
}

function getRouteExplanation(route) {
  const explanations = {
    [ROUTES.MONITOR]: 'Mild distress indicators detected. Manas continues supportive intake.',
    [ROUTES.CHECK_IN]: 'Multiple distress or isolation signals detected. Manas asks targeted check-in questions.',
    [ROUTES.HUMAN_RECOMMENDED]: 'Hopelessness, worthlessness, or self-harm signals detected. Human review is recommended.',
    [ROUTES.URGENT_ESCALATION]: 'Explicit suicidal intent detected. Manas locked escalation and created an urgent crisis case.',
    [ROUTES.EMERGENCY_PROTOCOL_RECOMMENDED]: 'User may have immediate access to means or unsafe location. Manas recommends emergency protocol.',
  };

  return explanations[route] || explanations[ROUTES.MONITOR];
}

function getSafetyChecklist(route) {
  if (route === ROUTES.EMERGENCY_PROTOCOL_RECOMMENDED) {
    return [
      'User may be in immediate danger',
      'Confirm location if appropriate',
      'Confirm access to means',
      'Keep user engaged',
      'Trigger organization emergency protocol',
      'Notify trained human responder',
    ];
  }

  if (route === ROUTES.URGENT_ESCALATION) {
    return [
      'Is the user alone?',
      'Does the user have a plan?',
      'Does the user have access to means?',
      'Is a safe person nearby?',
      'Is emergency/crisis support needed?',
    ];
  }

  return [];
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
  const hasImmediateDanger = evidence.some((item) => item.category === 'immediate_danger');
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
    priorityBadge: hasImmediateDanger
      ? 'Emergency Protocol Recommended'
      : riskLevel === RISK_LEVELS.CRITICAL ? 'Immediate Safety Assessment' : 'Human Review',
    severityBadge: riskLevel,
    phq9Score: phqScore,
    gad7Score: gadScore,
    riskLevel: riskLevel === RISK_LEVELS.CRITICAL ? 'Critical' : 'High',
    route: route === ROUTES.EMERGENCY_PROTOCOL_RECOMMENDED
      ? 'Emergency Protocol Recommended'
      : route === ROUTES.URGENT_ESCALATION ? 'Urgent Escalation' : route,
    escalationLock: route === ROUTES.URGENT_ESCALATION || route === ROUTES.EMERGENCY_PROTOCOL_RECOMMENDED ? 'Active' : 'Inactive',
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
      ? hasImmediateDanger
        ? 'Start with immediate safety assessment. Keep the user engaged, confirm location if appropriate, confirm access to means, and trigger the organization emergency protocol with a trained human responder. Do not claim dispatch happened in this demo.'
        : 'Start with immediate safety assessment. Confirm whether the user is alone, has access to means, has a safe person nearby, and needs emergency or crisis support. Do not begin with generic emotional exploration.'
      : 'Begin with supportive check-in, confirm available support, and assess whether risk signals are increasing.',
    whatNotToDo: [
      'Do not minimize',
      'Do not diagnose',
      'Do not begin with generic motivation',
      'Do not delay safety assessment',
    ],
    handoffSummary,
    status: 'Ready for human counsellor review',
    escalationReason: route === ROUTES.EMERGENCY_PROTOCOL_RECOMMENDED
      ? 'Immediate danger indicators detected in user message.'
      : route === ROUTES.URGENT_ESCALATION
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

function formatCaseId(caseNumber) {
  return `MANAS-${String(caseNumber).padStart(3, '0')}`;
}

function getPortalStatus(route) {
  const statuses = {
    [ROUTES.MONITOR]: 'No case created',
    [ROUTES.CHECK_IN]: 'Monitoring',
    [ROUTES.HUMAN_RECOMMENDED]: 'Human Review Recommended',
    [ROUTES.URGENT_ESCALATION]: 'Urgent Crisis Case Created',
    [ROUTES.EMERGENCY_PROTOCOL_RECOMMENDED]: 'Emergency Protocol Recommended',
  };

  return statuses[route] || 'Monitoring';
}

function getPortalPriority(route, riskLevel) {
  if (route === ROUTES.EMERGENCY_PROTOCOL_RECOMMENDED) return 'IMMEDIATE_DANGER';
  if (route === ROUTES.URGENT_ESCALATION) return 'CRITICAL';
  if (route === ROUTES.HUMAN_RECOMMENDED) return 'HIGH';
  return riskLevel;
}

function getPortalAction(route) {
  const actions = {
    [ROUTES.MONITOR]: 'Continue supportive intake',
    [ROUTES.CHECK_IN]: 'Ask targeted follow-up questions',
    [ROUTES.HUMAN_RECOMMENDED]: 'Prepare preliminary counsellor case',
    [ROUTES.URGENT_ESCALATION]: 'Create crisis case, lock escalation, generate handoff packet',
    [ROUTES.EMERGENCY_PROTOCOL_RECOMMENDED]: 'Show emergency protocol checklist',
  };

  return actions[route] || actions[ROUTES.MONITOR];
}

function getAssignedQueue(route) {
  const queues = {
    [ROUTES.HUMAN_RECOMMENDED]: 'Counsellor Review Queue - Simulated',
    [ROUTES.URGENT_ESCALATION]: 'Crisis Desk Queue - Simulated',
    [ROUTES.EMERGENCY_PROTOCOL_RECOMMENDED]: 'Emergency Protocol Queue - Simulated',
  };

  return queues[route] || 'No queue assigned';
}

function shouldCreatePortalCase(route) {
  return [
    ROUTES.HUMAN_RECOMMENDED,
    ROUTES.URGENT_ESCALATION,
    ROUTES.EMERGENCY_PROTOCOL_RECOMMENDED,
  ].includes(route);
}

function createPortalCase({
  previousState,
  route,
  riskLevel,
  evidence,
  timeline,
  counsellorBrief,
}) {
  if (!shouldCreatePortalCase(route)) return null;

  const existingCase = previousState.portalCase;
  const caseNumber = existingCase?.caseNumber || previousState.nextCaseNumber || 1;
  const statusBase = getPortalStatus(route);
  const reviewedSuffix = existingCase?.reviewed ? ' - Reviewed' : '';

  return {
    caseNumber,
    caseId: existingCase?.caseId || formatCaseId(caseNumber),
    createdAt: existingCase?.createdAt || 'session-live',
    source: 'Website Demo',
    status: existingCase?.handoffSimulated ? 'Human Handoff Simulated' : `${statusBase}${reviewedSuffix}`,
    priority: getPortalPriority(route, riskLevel),
    route,
    routeExplanation: getRouteExplanation(route),
    escalationReason: route === ROUTES.EMERGENCY_PROTOCOL_RECOMMENDED
      ? 'Immediate danger indicators detected. Emergency protocol is recommended for trained human review.'
      : route === ROUTES.URGENT_ESCALATION
        ? 'Explicit suicidal intent detected. Escalation is locked for crisis desk review.'
        : 'High-risk signals detected. Human review is recommended.',
    riskLevel,
    evidence: evidence.slice(0, 8).map((item) => item.label),
    conversationTimeline: timeline,
    safetyChecklist: getSafetyChecklist(route),
    handoffPacket: counsellorBrief ? 'Ready' : route === ROUTES.HUMAN_RECOMMENDED ? 'Preliminary case prepared' : 'Generating',
    assignedQueue: getAssignedQueue(route),
    reviewed: Boolean(existingCase?.reviewed),
    safetyAssessmentStarted: Boolean(existingCase?.safetyAssessmentStarted),
    activeSafetyQuestion: existingCase?.activeSafetyQuestion || '',
    handoffSimulated: Boolean(existingCase?.handoffSimulated),
    action: getPortalAction(route),
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
    portalCase: null,
    nextCaseNumber: 1,
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
  } else if (nextState.route === ROUTES.EMERGENCY_PROTOCOL_RECOMMENDED) {
    events.push({
      agent: 'Nirdeshak',
      action: 'Emergency protocol recommended',
      detail: 'immediate danger indicators detected',
      severity: 'critical',
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

  if (!previousState.portalCase && nextState.portalCase) {
    events.push({
      agent: 'Crisis Desk',
      action: 'Portal case created',
      detail: `${nextState.portalCase.caseId} assigned to ${nextState.portalCase.assignedQueue}`,
      severity: nextState.portalCase.priority === 'HIGH' ? 'high' : 'critical',
    });
  }

  return events.map((event, index) => ({
    id: `event-${nextState.timeline.length}-${index}`,
    ...event,
    userText: message,
  }));
}

export function analyzeMessage(message, previousState = getInitialTriageState(), context = {}) {
  const messageIndex = previousState.timeline.length;
  const contextualMessage = getContextualMessage(message, context);
  const detectedEvidence = detectEvidence(contextualMessage, messageIndex).map((item) => ({
    ...item,
    source: message,
  }));
  const phqDelta = detectedEvidence.reduce((sum, item) => sum + item.phq, 0);
  const gadDelta = detectedEvidence.reduce((sum, item) => sum + item.gad, 0);
  const phqScore = clamp(previousState.phqScore + phqDelta, 27);
  const gadScore = clamp(previousState.gadScore + gadDelta, 21);
  const evidence = [...detectedEvidence, ...previousState.evidence].slice(0, 20);
  const immediateDangerDetected = hasCategory(detectedEvidence, 'immediate_danger');
  const escalationLocked = previousState.escalationLocked || hasCategory(detectedEvidence, 'suicidal_intent') || immediateDangerDetected;
  const riskLevel = getRiskLevel({
    detectedEvidence,
    allEvidence: evidence,
    phqScore,
    gadScore,
    previousState,
  });
  const provisionalRoute = immediateDangerDetected
    ? ROUTES.EMERGENCY_PROTOCOL_RECOMMENDED
    : getRoute({
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
  const portalCase = createPortalCase({
    previousState,
    route,
    riskLevel,
    evidence,
    timeline,
    counsellorBrief,
  });
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
    portalCase,
    nextCaseNumber: portalCase && !previousState.portalCase
      ? previousState.nextCaseNumber + 1
      : previousState.nextCaseNumber,
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
