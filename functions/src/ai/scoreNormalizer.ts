import { ModerationResult, CategoryScore } from "../types";

interface RawAIResponse {
  decision: string;
  severity: number;
  confidence: number;
  categories: Record<string, { triggered: boolean; severity: number; confidence: number }>;
  explanation: string;
}

export function normalizeScores(
  raw: RawAIResponse,
  sensitivityMap: Record<string, number> = {}
): {
  decision: ModerationResult["decision"];
  severity: number;
  confidence: number;
  categories: Record<string, CategoryScore>;
  explanation: string;
  needsHumanReview: boolean;
} {
  // Apply sensitivity weighting to category scores
  const categories: Record<string, CategoryScore> = {};
  let maxSeverity = 0;
  let hasAlwaysReviewTrigger = false;

  for (const [name, score] of Object.entries(raw.categories || {})) {
    const sensitivity = sensitivityMap[name] ?? 70;
    const weightedSeverity = Math.round(score.severity * (sensitivity / 100));

    categories[name] = {
      triggered: score.triggered || weightedSeverity > 50,
      severity: weightedSeverity,
      confidence: Math.round(score.confidence * 100) / 100,
    };

    if (weightedSeverity > maxSeverity) {
      maxSeverity = weightedSeverity;
    }
  }

  // Calibrate overall severity and confidence
  const severity = Math.min(100, Math.max(0, Math.round(raw.severity)));
  const confidence = Math.min(1, Math.max(0, Math.round(raw.confidence * 100) / 100));

  // Determine final decision based on thresholds
  let decision: ModerationResult["decision"];
  let needsHumanReview = false;

  if (confidence < 0.60 || hasAlwaysReviewTrigger) {
    decision = "needs_human_review";
    needsHumanReview = true;
  } else if (severity > 85 && confidence > 0.95) {
    decision = "rejected";
  } else if (severity < 15 && confidence > 0.95) {
    decision = "approved";
  } else {
    // Anything else is flagged for review if confidence is not extremely high
    decision = severity > 50 ? "flagged" : "needs_human_review";
    if (confidence < 0.98) {
      needsHumanReview = true;
    }
  }

  return {
    decision,
    severity,
    confidence,
    categories,
    explanation: raw.explanation || "No explanation provided",
    needsHumanReview,
  };
}

export function parseAIResponse(text: string): RawAIResponse {
  try {
    // Try to extract JSON from the response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No JSON found in response");
    }
    return JSON.parse(jsonMatch[0]) as RawAIResponse;
  } catch (err) {
    // Return safe defaults on parse failure
    return {
      decision: "needs_human_review",
      severity: 50,
      confidence: 0.3,
      categories: {},
      explanation: "Failed to parse AI response — sent to human review",
    };
  }
}
