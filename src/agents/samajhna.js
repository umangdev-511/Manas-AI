const PHQ_SIGNALS = [
  {
    label: 'crisis language',
    score: 5,
    patterns: [
      /\bsuicide\b/i,
      /\bsuicidal\b/i,
      /\bwant to die\b/i,
      /\bend my life\b/i,
      /\bkill myself\b/i,
      /\bdon't want to live\b/i,
      /\bno point living\b/i,
      /\bcan't go on\b/i,
      /\bbetter off dead\b/i,
    ],
  },
  {
    label: 'hopelessness/worthlessness',
    score: 3,
    patterns: [
      /\bhopeless\b/i,
      /\bworthless\b/i,
      /\buseless\b/i,
      /\bno hope\b/i,
      /\bnothing matters\b/i,
      /\bfailure\b/i,
    ],
  },
  {
    label: 'sleep problems/fatigue',
    score: 2,
    patterns: [
      /\bcan't sleep\b/i,
      /\bcannot sleep\b/i,
      /\binsomnia\b/i,
      /\bsleeping too much\b/i,
      /\btired\b/i,
      /\bexhausted\b/i,
      /\bfatigue\b/i,
      /\bno energy\b/i,
    ],
  },
  {
    label: 'loss of interest',
    score: 2,
    patterns: [
      /\blost interest\b/i,
      /\blosing interest\b/i,
      /\bno interest\b/i,
      /\bdon't enjoy\b/i,
      /\bnothing feels fun\b/i,
      /\banhedonia\b/i,
    ],
  },
  {
    label: 'social withdrawal/loneliness',
    score: 2,
    patterns: [
      /\blonely\b/i,
      /\balone\b/i,
      /\bisolated\b/i,
      /\bwithdrawn\b/i,
      /\bno one to talk\b/i,
      /\bno one to share\b/i,
      /\bno one understands\b/i,
    ],
  },
  {
    label: 'general sadness',
    score: 1,
    patterns: [
      /\bsad\b/i,
      /\blow\b/i,
      /\bdown\b/i,
      /\bdepressed\b/i,
      /\bcrying\b/i,
      /\bempty\b/i,
    ],
  },
];

const GAD_SIGNALS = [
  {
    label: 'worry/anxiety',
    score: 2,
    patterns: [
      /\bworry\b/i,
      /\bworries\b/i,
      /\banxious\b/i,
      /\bnervous\b/i,
      /\banxiety\b/i,
      /\bworried\b/i,
      /\bworrying\b/i,
      /\bcan't stop worrying\b/i,
      /\ball the time\b/i,
    ],
  },
  {
    label: 'feeling out of control',
    score: 2,
    patterns: [
      /\bout of control\b/i,
      /\bcan't control\b/i,
      /\bcannot control\b/i,
      /\boverwhelmed\b/i,
      /\boverwhelm/i,
      /\bspiral/i,
      /\bfalling apart\b/i,
      /\btoo much to handle\b/i,
    ],
  },
  {
    label: 'restlessness',
    score: 1,
    patterns: [
      /\brestless\b/i,
      /\bon edge\b/i,
      /\bcan't sit still\b/i,
      /\bcannot sit still\b/i,
      /\btense\b/i,
    ],
  },
  {
    label: 'fear',
    score: 2,
    patterns: [
      /\bafraid\b/i,
      /\bscared\b/i,
      /\bfear\b/i,
      /\bterrified\b/i,
      /\bsomething bad\b/i,
      /\bworst will happen\b/i,
    ],
  },
  {
    label: 'panic',
    score: 2,
    patterns: [
      /\bpanic\b/i,
      /\bpanicked\b/i,
      /\bpanicking\b/i,
      /\bpanic attack\b/i,
    ],
  },
  {
    label: 'irritability',
    score: 1,
    patterns: [
      /\birritable\b/i,
      /\birritated\b/i,
      /\bannoyed\b/i,
      /\bsnapping\b/i,
    ],
  },
];

function clamp(value, max) {
  return Math.min(Math.max(value, 0), max);
}

function scoreSignals(messageText, signals) {
  return signals.reduce(
    (result, signal) => {
      const matched = signal.patterns.some((pattern) => pattern.test(messageText));

      if (!matched) return result;

      return {
        delta: result.delta + signal.score,
        triggeredKeywords: [...result.triggeredKeywords, signal.label],
      };
    },
    { delta: 0, triggeredKeywords: [] },
  );
}

export function scoreMessage(messageText, currentPHQ = 0, currentGAD = 0) {
  const phqResult = scoreSignals(messageText, PHQ_SIGNALS);
  const gadResult = scoreSignals(messageText, GAD_SIGNALS);
  const crisisKeywordFound = phqResult.triggeredKeywords.includes('crisis language');

  const newPHQ = clamp(currentPHQ + phqResult.delta, 27);
  const newGAD = clamp(currentGAD + gadResult.delta, 21);

  return {
    newPHQ,
    newGAD,
    phqDelta: newPHQ - currentPHQ,
    gadDelta: newGAD - currentGAD,
    triggeredKeywords: [...phqResult.triggeredKeywords, ...gadResult.triggeredKeywords],
    crisisKeywordFound,
  };
}
