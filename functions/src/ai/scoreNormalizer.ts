import { ModerationResult, CategoryScore } from "../types";

interface RawAIResponse {
  decision: string;
  severity: number;
  confidence: number;
  categories: Record<string, { triggered: boolean; severity: number; confidence: number }>;
  explanation: string;
}

// All known categories — used to fill missing ones with safe defaults
const ALL_KNOWN_CATEGORIES = [
  "hateSpeech",
  "harassment",
  "violence",
  "spam",
  "nsfw",
  "illegalContent",
  "selfHarm",
  "misinformation",
];

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
  const categories: Record<string, CategoryScore> = {};
  let maxSeverity = 0;

  // Ensure all known categories are present, fill missing ones with safe defaults
  const rawCategories = raw.categories || {};
  const allCategoryNames = new Set([
    ...ALL_KNOWN_CATEGORIES,
    ...Object.keys(rawCategories),
  ]);

  for (const name of allCategoryNames) {
    const score = rawCategories[name] ?? { triggered: false, severity: 0, confidence: 0.95 };
    const sensitivity = sensitivityMap[name] ?? 100;

    const rawSeverity = Math.min(100, Math.max(0, Math.round(score.severity)));

    // Apply sensitivity as a true directional weight:
    //   sensitivity = 100 → no change
    //   sensitivity = 60  → reduce to 60% of raw (less sensitive to this category)
    //   sensitivity = 120 → increase by 20% (more sensitive), capped at 100
    const weightedSeverity = Math.min(100, Math.round(rawSeverity * (sensitivity / 100)));

    const finalCatSeverity = weightedSeverity;
    const finalConfidence = Math.min(1, Math.max(0, Math.round(score.confidence * 100) / 100));

    // A category is "triggered" if the AI explicitly says so OR severity after weighting crosses 25
    const triggered = score.triggered === true || finalCatSeverity >= 25;

    categories[name] = {
      triggered,
      severity: finalCatSeverity,
      confidence: finalConfidence,
    };

    if (finalCatSeverity > maxSeverity) {
      maxSeverity = finalCatSeverity;
    }
  }


  // Overall severity: use the maximum of AI-reported and computed category max
  const aiSeverity = Math.min(100, Math.max(0, Math.round(raw.severity ?? 0)));
  const severity = Math.max(aiSeverity, maxSeverity);
  const confidence = Math.min(1, Math.max(0, Math.round((raw.confidence ?? 0.5) * 100) / 100));

  // ──── REFINED DECISION ENGINE ────────────────────────────────────────────────
  // Priority order matters — applied top to bottom
  let decision: ModerationResult["decision"];
  let needsHumanReview = false;

  if (confidence < 0.65) {
    // Not confident enough — always defer to humans
    decision = "needs_human_review";
    needsHumanReview = true;
  } else if (severity >= 75 && confidence >= 0.80) {
    // High-severity + high-confidence = definitive rejection
    decision = "rejected";
  } else if (severity >= 75) {
    // High-severity but lower confidence — still flag and review
    decision = "flagged";
    needsHumanReview = true;
  } else if (severity >= 35) {
    // Moderate violations — flag for human attention
    decision = "flagged";
    needsHumanReview = severity >= 55; // Only mandate human review above 55
  } else if (severity <= 24 && confidence >= 0.80) {
    // Low severity + high confidence = clearly safe
    decision = "approved";
  } else {
    // Borderline: low-moderate severity but uncertain — flag for safety
    decision = "flagged";
    needsHumanReview = false;
  }

  // Override with AI's decision only if AI says "rejected" and we have high confidence
  // This prevents the AI from being overridden when it correctly identifies severe content
  if (raw.decision === "rejected" && confidence >= 0.75 && decision !== "rejected") {
    decision = "rejected";
    needsHumanReview = false;
  }

  // Override with AI's decision if AI says "approved" and severity is genuinely low
  if (raw.decision === "approved" && severity <= 24 && confidence >= 0.80) {
    decision = "approved";
    needsHumanReview = false;
  }

  return {
    decision,
    severity,
    confidence,
    categories,
    explanation: raw.explanation || "No explanation provided.",
    needsHumanReview,
  };
}

export function parseAIResponse(text: string): RawAIResponse {
  try {
    if (!text || text.trim() === "") {
      throw new Error("Empty AI response");
    }

    // Strip markdown fences if model wrapped the JSON
    let cleaned = text.trim();
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");

    // Extract JSON object — use the largest JSON block found
    const jsonMatches = cleaned.match(/\{[\s\S]*\}/g);
    if (!jsonMatches || jsonMatches.length === 0) {
      throw new Error("No JSON object found in AI response");
    }

    // Try each match from largest to smallest
    const sortedMatches = jsonMatches.sort((a, b) => b.length - a.length);
    for (const match of sortedMatches) {
      try {
        const parsed = JSON.parse(match) as RawAIResponse;
        // Basic validation
        if (typeof parsed.decision === "string" && typeof parsed.severity === "number") {
          return parsed;
        }
      } catch {
        // Try next match
      }
    }

    throw new Error("No valid JSON structure found in AI response");
  } catch (err) {
    console.error("[ScoreNormalizer] Failed to parse AI response:", err, "\nRaw text:", text?.substring(0, 500));
    // Return safe defaults on parse failure — defer to human review
    return {
      decision: "needs_human_review",
      severity: 30,
      confidence: 0.4,
      categories: {},
      explanation: "AI response parsing failed — content sent to human review for safety.",
    };
  }
}
