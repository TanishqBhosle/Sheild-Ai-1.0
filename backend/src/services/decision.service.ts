import type {
  GeminiAnalysisResult,
  PolicyThresholds,
  ModerationRule,
  DecisionResult,
  DecisionType,
} from '../types'

const matchesCondition = (
  result: GeminiAnalysisResult,
  condition: ModerationRule['conditions'][0]
): boolean => {
  switch (condition.field) {
    case 'category':
      return condition.operator === 'equals'
        ? result.category === condition.value
        : condition.operator === 'contains'
          ? result.category
              .toLowerCase()
              .includes(String(condition.value).toLowerCase())
          : false

    case 'score': {
      const maxScore = Math.max(...Object.values(result.scores))
      switch (condition.operator) {
        case 'gt':
          return maxScore > (condition.value as number)
        case 'lt':
          return maxScore < (condition.value as number)
        case 'equals':
          return maxScore === (condition.value as number)
        default:
          return false
      }
    }

    default:
      return false
  }
}

export const evaluateDecision = (
  geminiResult: GeminiAnalysisResult,
  thresholds: PolicyThresholds,
  rules: ModerationRule[],
  automation: {
    autoBlockCritical: boolean
    humanReviewMediumPlus: boolean
  }
): DecisionResult => {
  const activeRules = [...rules]
    .filter((r) => r.isActive)
    .sort((a, b) => a.priority - b.priority)

  for (const rule of activeRules) {
    const allMatch = rule.conditions.every((c) =>
      matchesCondition(geminiResult, c)
    )
    if (allMatch) {
      return {
        action: rule.action,
        severity: geminiResult.severity,
        requiresHumanReview: rule.action === 'flag',
        appliedRule: rule.ruleId,
      }
    }
  }

  const scores = geminiResult.scores
  const overrides: DecisionType[] = []

  if (scores.hateSpeech >= thresholds.hateSpeech) {
    overrides.push('block')
  }
  if (scores.spam >= thresholds.spam) {
    overrides.push('block')
  }
  if (scores.violence >= thresholds.violence) {
    overrides.push('block')
  }
  if (scores.nsfw >= thresholds.nsfw) {
    overrides.push('block')
  }
  if (scores.harassment >= thresholds.harassment) {
    overrides.push('block')
  }

  let action: DecisionType =
    overrides.length > 0 ? 'block' : geminiResult.decision

  if (automation.autoBlockCritical && geminiResult.severity === 'critical') {
    action = 'block'
  }

  const requiresHumanReview =
    action === 'flag' ||
    (automation.humanReviewMediumPlus &&
      ['medium', 'high', 'critical'].includes(geminiResult.severity))

  return {
    action,
    severity: geminiResult.severity,
    requiresHumanReview,
  }
}
