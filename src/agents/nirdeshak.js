function getRiskLevel(phqScore, gadScore, crisisKeywordFound = false) {
  if (crisisKeywordFound || phqScore >= 20) return 'SEVERE';
  if (phqScore >= 15 || gadScore >= 15) return 'MODERATE-SEVERE';
  if (phqScore >= 10 || gadScore >= 10) return 'MODERATE';
  if (phqScore >= 5 || gadScore >= 5) return 'MILD';
  return 'MINIMAL';
}

export function routeCase({
  phqScore = 0,
  gadScore = 0,
  crisisKeywordFound = false,
}) {
  const riskLevel = getRiskLevel(phqScore, gadScore, crisisKeywordFound);

  if (crisisKeywordFound) {
    return {
      shouldEscalate: true,
      reason: 'Crisis keyword detected',
      riskLevel,
    };
  }

  if (phqScore >= 15) {
    return {
      shouldEscalate: true,
      reason: `PHQ-9 score exceeded threshold (${phqScore}/27)`,
      riskLevel,
    };
  }

  if (gadScore >= 15) {
    return {
      shouldEscalate: true,
      reason: `GAD-7 score exceeded threshold (${gadScore}/21)`,
      riskLevel,
    };
  }

  return {
    shouldEscalate: false,
    reason: 'Threshold check — monitoring',
    riskLevel,
  };
}
