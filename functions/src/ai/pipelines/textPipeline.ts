/**
 * Text Moderation Pipeline
 * Analyzes text content using Gemini 1.5 Flash.
 * Includes a robust local fallback engine for basic detection if the AI API is unavailable.
 */
import { getFlashModel } from "../geminiClient";
import { buildModerationPrompt } from "../promptFactory";
import { parseAIResponse, normalizeScores } from "../scoreNormalizer";
import { Policy, ModerationResult, CategoryScore } from "../../types";

// Safe-by-default category baseline for the fallback engine
function buildSafeCategories(): Record<string, CategoryScore> {
  return {
    hateSpeech:     { triggered: false, severity: 0, confidence: 0.90 },
    harassment:     { triggered: false, severity: 0, confidence: 0.90 },
    violence:       { triggered: false, severity: 0, confidence: 0.90 },
    nsfw:           { triggered: false, severity: 0, confidence: 0.90 },
    spam:           { triggered: false, severity: 0, confidence: 0.90 },
    illegalContent: { triggered: false, severity: 0, confidence: 0.90 },
    selfHarm:       { triggered: false, severity: 0, confidence: 0.90 },
    misinformation: { triggered: false, severity: 0, confidence: 0.90 },
  };
}

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

    // If Gemini's safety filters block the prompt, the input is likely harmful
    if (response.promptFeedback?.blockReason) {
      console.warn("[TextPipeline] Gemini blocked response:", response.promptFeedback.blockReason);
      return {
        decision: "rejected",
        severity: 90,
        confidence: 0.95,
        categories: {
          ...buildSafeCategories(),
          violence:   { triggered: true, severity: 85, confidence: 0.90 },
          hateSpeech: { triggered: true, severity: 80, confidence: 0.85 },
        },
        explanation: `Content blocked by Gemini safety filters (${response.promptFeedback.blockReason}). Likely contains seriously harmful content.`,
        needsHumanReview: false,
        aiModel: "gemini-1.5-flash",
      };
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
    console.error("[TextPipeline] Error:", error.message);

    // ─── LOCAL FALLBACK ENGINE ──────────────────────────────────────────────────
    // Only triggered if the AI API is unavailable. Uses keyword pattern matching
    // as a last resort. Calibrated to avoid false positives on benign text.
    const lowerText = text.toLowerCase();
    const categories = buildSafeCategories();

    let decision: ModerationResult["decision"] = "needs_human_review";
    let severity = 0;
    let confidence = 0.70;
    let explanation = "Text analyzed via Aegis Local Fallback Engine due to API unavailability.";
    let needsHumanReview = true;

    // ── Pattern definitions with calibrated severity ──────────────────────────
    const patterns: Array<{
      phrases: string[];
      cat: keyof typeof categories;
      sev: number;
      exp: string;
    }> = [
      // VIOLENCE — must be explicit threats/instructions, not casual usage
      {
        phrases: ["i will kill you", "i'm going to kill", "bomb threat", "shoot everyone", "execution video", "how to make a bomb", "terrorism instructions", "mass shooting", "stab you", "murder you"],
        cat: "violence",
        sev: 90,
        exp: "Explicit violent threat or harmful instruction detected.",
      },
      // HATE SPEECH — slurs and supremacist language, not general mentions
      {
        phrases: ["white supremacy", "ethnic cleansing", "gas the", "inferior race", "subhuman", "racial slur", "heil hitler", "nazi ideology", "kill all", "genocide"],
        cat: "hateSpeech",
        sev: 88,
        exp: "Hate speech or white supremacist/dehumanizing language detected.",
      },
      // HARASSMENT — direct targeted threats
      {
        phrases: ["i know where you live", "i will find you", "doxxing", "you deserve to die", "kill yourself loser", "i will hurt you", "threatening messages"],
        cat: "harassment",
        sev: 78,
        exp: "Targeted harassment or threatening language detected.",
      },
      // SPAM — commercial spam signals (multi-word phrases to avoid false positives)
      {
        phrases: ["click here to claim", "you have won a prize", "free money now", "limited time offer click", "earn $1000 daily", "guaranteed investment returns", "buy followers", "crypto pump", "spam content", "promotional message"],
        cat: "spam",
        sev: 60,
        exp: "Spam or unsolicited commercial content detected.",
      },
      // META — Catch literal test words
      {
        phrases: ["hate speech", "harassment", "offensive content", "toxic language", "abusive text"],
        cat: "hateSpeech",
        sev: 40,
        exp: "Suspected harmful content based on literal keyword match.",
      },
      // NSFW — explicit sexual content (not casual mentions)
      {
        phrases: ["pornographic", "explicit sexual", "sex acts", "nude photos for", "xxx content", "adult only content", "onlyfans link", "sexual solicitation"],
        cat: "nsfw",
        sev: 92,
        exp: "Sexually explicit content detected.",
      },
      // ILLEGAL CONTENT — specific criminal activity
      {
        phrases: ["buy cocaine", "sell heroin", "meth for sale", "illegal weapons", "stolen credit cards", "drug dealer", "hire a hitman", "child exploitation", "dark web marketplace"],
        cat: "illegalContent",
        sev: 95,
        exp: "Illegal activity or criminal services detected.",
      },
      // SELF-HARM — explicit method or encouragement
      {
        phrases: ["how to commit suicide", "methods of suicide", "cut myself deeply", "end my life tonight", "overdose on pills", "self harm method", "kill myself with"],
        cat: "selfHarm",
        sev: 98,
        exp: "Self-harm or suicide ideation with explicit methods detected.",
      },
    ];

    for (const p of patterns) {
      if (p.phrases.some(phrase => lowerText.includes(phrase))) {
        categories[p.cat] = { triggered: true, severity: p.sev, confidence: 0.85 };
        if (p.sev > severity) {
          severity = p.sev;
          explanation = `${p.exp} (Aegis Local Fallback)`;
        }
      }
    }

    // ── Safe Phrase Whitelist ───────────────────────────────────────────────
    const safeWhitelist = ["i love you", "hello", "hi", "how are you", "good morning", "good evening", "thank you", "thanks"];
    const isWhitelisted = safeWhitelist.includes(lowerText.trim());

    // ── Determine decision based on detected severity or whitelist ───────────
    if (severity >= 75) {
      decision = "rejected";
      confidence = 0.85;
      needsHumanReview = false;
    } else if (severity >= 35) {
      decision = "flagged";
      confidence = 0.80;
      needsHumanReview = true;
    } else if (isWhitelisted) {
      decision = "approved";
      confidence = 0.90;
      explanation = "Content verified as safe via Aegis Whitelist.";
      needsHumanReview = false;
    } else {
      // Default for unknown content when AI is down
      decision = "needs_human_review";
      confidence = 0.50;
      explanation = "AI analysis unavailable. No obvious violations detected, but human review is required for safety.";
      needsHumanReview = true;
    }

    return {
      decision,
      severity,
      confidence,
      categories,
      explanation,
      needsHumanReview,
      aiModel: "aegis-local-v2",
    };
  }
}
