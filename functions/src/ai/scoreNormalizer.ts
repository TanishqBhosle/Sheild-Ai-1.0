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
    const sensitivity = sensitivityMap[name] ?? 100; // Default to 100% sensitivity
    const weightedSeverity = Math.round(score.severity * (sensitivity / 100));
    
    // Safety: use the higher of the two values
    const finalCatSeverity = Math.max(score.severity, weightedSeverity);

    categories[name] = {
      triggered: score.triggered || finalCatSeverity >= 20,
      severity: finalCatSeverity,
      confidence: Math.round(score.confidence * 100) / 100,
    };

    if (finalCatSeverity > maxSeverity) {
      maxSeverity = finalCatSeverity;
    }
  }

  // Calibrate overall severity (use the maximum of category severities if it's higher than the overall)
  const baseSeverity = Math.min(100, Math.max(0, Math.round(raw.severity)));
  const severity = Math.max(baseSeverity, maxSeverity);
  const confidence = Math.min(1, Math.max(0, Math.round(raw.confidence * 100) / 100));

  // Determine final decision based on thresholds
  let decision: ModerationResult["decision"];
  let needsHumanReview = false;

  // SAFETY-FIRST THRESHOLDS
  if (confidence < 0.70) {
    decision = "needs_human_review";
    needsHumanReview = true;
  } else if (severity >= 60) {
    decision = "rejected";
  } else if (severity <= 10 && confidence > 0.98) {
    // Only auto-approve if extremely safe and extremely confident
    decision = "approved";
  } else {
    // Everything else requires eyes
    decision = "flagged";
    needsHumanReview = true;
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
