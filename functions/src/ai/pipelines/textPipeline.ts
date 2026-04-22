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
      { words: ["kill", "die", "hurt", "attack", "murder", "weapon", "shoot", "bomb", "destroy"], cat: "violence", sev: 90, exp: "Potential violence or threat detected." },
      { words: ["hate", "racist", "nazi", "terrorist", "dumb", "stupid", "slur", "inferior", "superior race", "discrimination"], cat: "hateSpeech", sev: 85, exp: "Hate speech or discriminatory language detected." },
      { words: ["buy", "discount", "click here", "free money", "winner", "prize", "spam", "congratulations"], cat: "spam", sev: 55, exp: "Spam-like patterns detected." },
      { words: ["sex", "porn", "adult", "nude", "xxx", "nsfw", "naked"], cat: "nsfw", sev: 95, exp: "Explicit content detected." },
      { words: ["drug", "cocaine", "heroin", "meth", "illegal", "manufacture", "prohibited", "substance"], cat: "illegalContent", sev: 90, exp: "Illegal or prohibited content detected." }
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

    // Determine decision based on highest severity triggered
    if (severity >= 60) {
      decision = "rejected";
    } else if (severity >= 30) {
      decision = "flagged";
    } else {
      // If no specific patterns matched but we hit an error, flag for safety
      decision = "flagged";
      explanation = "Text analysis was inconclusive or blocked. Flagged for safety review.";
    }

    return {
      decision,
      severity,
      confidence: 0.9,
      categories,
      explanation: `${explanation} (Aegis Local Fallback)`,
      needsHumanReview: true, // Always review if fallback was triggered
      aiModel: "aegis-local-v1",
    };
  }
}
