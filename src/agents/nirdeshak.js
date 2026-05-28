import { ROUTES } from '../triage/triageEngine.js';

export function routeCase({
  phqScore = 0,
  gadScore = 0,
  crisisKeywordFound = false,
}) {
  if (crisisKeywordFound) {
    return {
      shouldEscalate: true,
      reason: 'Critical risk locked after explicit crisis signal',
      riskLevel: 'CRITICAL',
      route: ROUTES.URGENT_ESCALATION,
    };
  }

  if (phqScore >= 8) {
    return {
      shouldEscalate: false,
      reason: 'Human support recommended by central triage engine',
      riskLevel: 'HIGH',
      route: ROUTES.HUMAN_RECOMMENDED,
    };
  }

  if (phqScore >= 5 || gadScore >= 6) {
    return {
      shouldEscalate: false,
      reason: 'Check-in route recommended by central triage engine',
      riskLevel: 'MODERATE',
      route: ROUTES.CHECK_IN,
    };
  }

  return {
    shouldEscalate: false,
    reason: 'Monitoring route recommended by central triage engine',
    riskLevel: 'LOW',
    route: ROUTES.MONITOR,
  };
}
