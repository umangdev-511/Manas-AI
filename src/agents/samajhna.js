import { analyzeMessage, getInitialTriageState } from '../triage/triageEngine.js';

export function scoreMessage(messageText, currentPHQ = 0, currentGAD = 0) {
  const previousState = {
    ...getInitialTriageState(),
    phqScore: currentPHQ,
    gadScore: currentGAD,
  };
  const nextState = analyzeMessage(messageText, previousState);
  const latestTimeline = nextState.timeline[nextState.timeline.length - 1];

  return {
    newPHQ: nextState.phqScore,
    newGAD: nextState.gadScore,
    phqDelta: nextState.phqScore - currentPHQ,
    gadDelta: nextState.gadScore - currentGAD,
    triggeredKeywords: latestTimeline?.detectedEvidence || [],
    crisisKeywordFound: nextState.escalationLocked,
  };
}
