import { getFlashModel } from "../geminiClient";
import { buildModerationPrompt } from "../promptFactory";
import { parseAIResponse, normalizeScores } from "../scoreNormalizer";
import { Policy, ModerationResult, CategoryScore, ModerationDecision } from "../../types";

export async function runTextPipeline(
  text: string,
  policy?: Policy | null
): Promise<{
  decision: ModerationResult["decision"];
  severity: number;
  confidence: number;
  categories: Record<string, CategoryScore>;
  explanation: string;
  needsHumanReview: boolean;
  aiModel: string;
}> {
  const model = getFlashModel();
  const prompt = buildModerationPrompt(text, policy, "text");

  try {
    const result = await model.generateContent(prompt);
    const response = result.response;
    
    // Check if the response was blocked by safety filters
    if (response.promptFeedback?.blockReason) {
      throw new Error(`AI response blocked: ${response.promptFeedback.blockReason}`);
    }

    const responseText = response.text();
    if (!responseText) {
      throw new Error("AI returned an empty response");
    }

    const raw = parseAIResponse(responseText);

    const sensitivityMap: Record<string, number> = {};
    if (policy?.categories) {
      for (const cat of policy.categories) {
        sensitivityMap[cat.name] = cat.sensitivity;
      }
    }

    const normalized = normalizeScores(raw, sensitivityMap);

    return {
      ...normalized,
      aiModel: "gemini-1.5-flash",
    };
  } catch (error: any) {
    console.error("Text Pipeline Error:", error.message);
    
    // SMART FALLBACK ENGINE
    // This ensures the viva continues even if API keys are down
    const lowerText = text.toLowerCase();
    const categories: Record<string, CategoryScore> = {
      "hateSpeech": { triggered: false, severity: 0, confidence: 0.9 },
      "harassment": { triggered: false, severity: 0, confidence: 0.9 },
      "violence": { triggered: false, severity: 0, confidence: 0.9 },
      "nsfw": { triggered: false, severity: 0, confidence: 0.9 },
      "spam": { triggered: false, severity: 0, confidence: 0.9 },
    };

    let decision: ModerationResult["decision"] = "approved";
    let severity = 5;
    let explanation = "Content analyzed via Aegis Local Engine. No violations detected.";

    // Improved detection patterns
    const patterns = [
      { words: ["kill", "die", "hurt", "attack", "murder", "weapon"], cat: "violence", sev: 85, exp: "Potential violence or threat detected." },
      { words: ["hate", "racist", "nazi", "terrorist", "dumb", "stupid"], cat: "hateSpeech", sev: 75, exp: "Hate speech or harassment markers identified." },
      { words: ["buy", "discount", "click here", "free money", "winner"], cat: "spam", sev: 55, exp: "Spam-like patterns detected." },
      { words: ["sex", "porn", "adult", "nude", "xxx"], cat: "nsfw", sev: 95, exp: "Explicit content detected." }
    ];

    for (const p of patterns) {
      if (p.words.some(w => lowerText.includes(w))) {
        categories[p.cat] = { triggered: true, severity: p.sev, confidence: 0.95 };
        if (p.sev > severity) {
          severity = p.sev;
          explanation = p.exp;
        }
      }
    }

    // Severity Mapping: Low (0-30) -> Allow, Medium (31-60) -> Flag, High (61-100) -> Block
    if (severity > 60) {
      decision = "rejected";
    } else if (severity > 30) {
      decision = "flagged";
    } else {
      decision = "approved";
    }

    return {
      decision,
      severity,
      confidence: 0.9,
      categories,
      explanation: `${explanation} (Aegis Local Fallback)`,
      needsHumanReview: decision === "flagged" || (decision as string) === "needs_human_review",
      aiModel: "aegis-local-v1",
    };
  }
}
