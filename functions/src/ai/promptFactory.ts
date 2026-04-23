import { Policy, PolicyCategory } from "../types";

export function buildModerationPrompt(
  contentText: string,
  policy?: Policy | null,
  contentType: string = "text"
): string {
  const enabledCategories = policy?.categories?.filter(c => c.enabled) || getDefaultCategories();
  
  const categoryDefinitions: Record<string, string> = {
    hateSpeech: "Attacking, dehumanizing, or inciting violence against protected groups (race, religion, gender, etc.).",
    harassment: "Targeted insults, bullying, stalking, or persistent unwanted contact.",
    violence: "Graphic violence, threats of physical harm, or instructions for weapons/assault.",
    spam: "Irrelevant commercial content, phishing, repetitive messages, or scams.",
    nsfw: "Sexually explicit content, pornography, or inappropriate nudity.",
    illegalContent: "Sale or promotion of illegal drugs, stolen goods, or criminal services.",
    selfHarm: "Encouraging or providing methods for suicide or self-injury.",
    misinformation: "Harmful false information regarding health, safety, or democratic processes."
  };

  const categoryList = enabledCategories.map(c =>
    `- ${c.name}: ${categoryDefinitions[c.name] || ""} (Sensitivity: ${c.sensitivity}/100)`
  ).join("\n");

  const customInstructions = policy?.customInstructions
    ? `\n\nORGANIZATION CUSTOM RULES:\n${policy.customInstructions}`
    : "";

  return `You are Aegis AI, the world's most advanced content moderation engine. Your goal is to provide 100% accurate, unbiased, and context-aware safety analysis.

CORE MISSION: Protect users while minimizing false positives.

MODERATION TAXONOMY:
${categoryList}
${customInstructions}

SCORING FRAMEWORK:
1. severity (0-100): 
   - 0-19: Safe/Neutral
   - 20-39: Minor concern/Borderline
   - 40-69: Clear violation/Medium risk
   - 70-100: Extreme violation/High risk
2. confidence (0.0-1.0): How certain you are of the match.
3. decision: 
   - "approved": Safe content.
   - "rejected": Clear and high-risk violations (severity > 70).
   - "flagged": Needs attention (severity 30-70).
   - "needs_human_review": Ambiguous, subtle nuance, or low confidence (< 0.75).

CONTENT TO ANALYZE (${contentType.toUpperCase()}):
"""
${contentText}
"""

OUTPUT REQUIREMENT:
Respond with a SINGLE JSON object. Be concise in the explanation but precise in the scores.
{
  "decision": "approved" | "rejected" | "flagged" | "needs_human_review",
  "severity": <max_overall_severity>,
  "confidence": <overall_confidence>,
  "categories": {
    "category_name": { "triggered": <bool>, "severity": <0-100>, "confidence": <0-1> }
  },
  "explanation": "<one-sentence professional reasoning for the final decision>"
}`;
}

export function buildImagePrompt(policy?: Policy | null): string {
  return `You are Aegis AI Vision. Analyze the provided image for safety violations with extreme precision.

TAXONOMY:
- hateSpeech: Visual symbols of hate, slurs in text, or dehumanizing imagery.
- violence: Blood, gore, weapons, or physical assault.
- nsfw: Nudity, sexual acts, or suggestive imagery.
- illegalContent: Drugs, contraband, or prohibited substances.

SCORING:
- rejected if severity > 65
- flagged if severity 25-65
- approved if severity < 25

OUTPUT FORMAT (JSON ONLY):
{
  "decision": "approved" | "rejected" | "flagged" | "needs_human_review",
  "severity": <0-100>,
  "confidence": <0-1>,
  "categories": { 
    "category": { "triggered": <bool>, "severity": <0-100>, "confidence": <0-1> }
  },
  "explanation": "<detailed description of what is visible and why it violates or passes policies>"
}`;
}

function getDefaultCategories(): PolicyCategory[] {
  return [
    { name: "hateSpeech", enabled: true, sensitivity: 85, alwaysReview: false },
    { name: "harassment", enabled: true, sensitivity: 80, alwaysReview: false },
    { name: "violence", enabled: true, sensitivity: 90, alwaysReview: false },
    { name: "spam", enabled: true, sensitivity: 60, alwaysReview: false },
    { name: "nsfw", enabled: true, sensitivity: 95, alwaysReview: false },
    { name: "illegalContent", enabled: true, sensitivity: 95, alwaysReview: true },
    { name: "selfHarm", enabled: true, sensitivity: 95, alwaysReview: true },
  ];
}

