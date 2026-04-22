import { Policy, PolicyCategory } from "../types";

export function buildModerationPrompt(
  contentText: string,
  policy?: Policy | null,
  contentType: string = "text"
): string {
  const enabledCategories = policy?.categories?.filter(c => c.enabled) || getDefaultCategories();
  const categoryList = enabledCategories.map(c =>
    `- ${c.name} (sensitivity: ${c.sensitivity}/100${c.alwaysReview ? ", ALWAYS_REVIEW" : ""})`
  ).join("\n");

  const customInstructions = policy?.customInstructions
    ? `\n\nADDITIONAL INSTRUCTIONS FROM ORGANIZATION:\n${policy.customInstructions}`
    : "";

  return `You are Aegis AI, a production content moderation engine. Analyze the following ${contentType} content for policy violations.

MODERATION CATEGORIES TO CHECK:
${categoryList}

SCORING RULES:
- severity: 0-100 integer (0 = perfectly safe, 100 = extreme violation)
- confidence: 0.0-1.0 float (how certain you are about your assessment)
- For each category, provide triggered (boolean), severity (0-100), and confidence (0-1)
- decision: "approved" if severity < 20 and confidence > 0.85
- decision: "rejected" if severity > 70 and confidence > 0.85
- decision: "flagged" if severity 20-70 and confidence > 0.60
- decision: "needs_human_review" if confidence < 0.60 or any ALWAYS_REVIEW category is triggered
${customInstructions}

CONTENT TO ANALYZE:
"""
${contentText}
"""

Respond with ONLY valid JSON in this exact format:
{
  "decision": "approved" | "rejected" | "flagged" | "needs_human_review",
  "severity": <number 0-100>,
  "confidence": <number 0.0-1.0>,
  "categories": {
    "<categoryName>": {
      "triggered": <boolean>,
      "severity": <number 0-100>,
      "confidence": <number 0.0-1.0>
    }
  },
  "explanation": "<brief explanation of the decision>"
}`;
}

export function buildImagePrompt(policy?: Policy | null): string {
  const enabledCategories = policy?.categories?.filter(c => c.enabled) || getDefaultCategories();
  const categoryList = enabledCategories.map(c => c.name).join(", ");

  return `You are Aegis AI, analyzing an image for content moderation violations.

Check for these categories: ${categoryList}

Respond with ONLY valid JSON:
{
  "decision": "approved" | "rejected" | "flagged" | "needs_human_review",
  "severity": <0-100>,
  "confidence": <0.0-1.0>,
  "categories": { "<name>": { "triggered": <bool>, "severity": <0-100>, "confidence": <0-1> } },
  "explanation": "<brief explanation>"
}`;
}

function getDefaultCategories(): PolicyCategory[] {
  return [
    { name: "hateSpeech", enabled: true, sensitivity: 70, alwaysReview: false },
    { name: "harassment", enabled: true, sensitivity: 70, alwaysReview: false },
    { name: "violence", enabled: true, sensitivity: 70, alwaysReview: false },
    { name: "nsfw", enabled: true, sensitivity: 80, alwaysReview: false },
    { name: "spam", enabled: true, sensitivity: 50, alwaysReview: false },
    { name: "selfHarm", enabled: true, sensitivity: 90, alwaysReview: true },
    { name: "misinformation", enabled: true, sensitivity: 60, alwaysReview: false },
  ];
}
