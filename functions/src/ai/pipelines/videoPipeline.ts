/**
 * Video Moderation Pipeline
 * Sends the video directly to Gemini 1.5 Flash for dual-channel (visual + audio) analysis.
 * Falls back to needs_human_review on error — never fabricates violations.
 */
import { getFlashModel } from "../geminiClient";
import { buildVideoPrompt } from "../promptFactory";
import { parseAIResponse, normalizeScores } from "../scoreNormalizer";
import { Policy, ModerationResult, CategoryScore } from "../../types";
import { fetchMediaAsBase64 } from "../../utils/fetchMedia";

// Safe baseline categories when falling back
function buildSafeCategories(): Record<string, CategoryScore> {
  return {
    hateSpeech:     { triggered: false, severity: 0, confidence: 0.0 },
    harassment:     { triggered: false, severity: 0, confidence: 0.0 },
    violence:       { triggered: false, severity: 0, confidence: 0.0 },
    nsfw:           { triggered: false, severity: 0, confidence: 0.0 },
    illegalContent: { triggered: false, severity: 0, confidence: 0.0 },
    spam:           { triggered: false, severity: 0, confidence: 0.0 },
    selfHarm:       { triggered: false, severity: 0, confidence: 0.0 },
    misinformation: { triggered: false, severity: 0, confidence: 0.0 },
  };
}

export async function runVideoPipeline(
  videoInput: string,
  mimeType: string,
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

  try {
    let videoBase64 = videoInput;
    let finalMimeType = mimeType;

    // Fetch remote video and convert to base64 if needed
    if (videoInput.startsWith("http")) {
      const fetched = await fetchMediaAsBase64(videoInput);
      videoBase64 = fetched.data;
      finalMimeType = fetched.mimeType;
    }

    // Build the comprehensive video moderation prompt
    const prompt = buildVideoPrompt(policy);

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: videoBase64,
          mimeType: finalMimeType,
        },
      },
    ]);

    const response = result.response;

    // If Gemini's safety filters block the video — it's likely harmful content
    if (response.promptFeedback?.blockReason) {
      console.warn("[VideoPipeline] Gemini blocked video response:", response.promptFeedback.blockReason);
      return {
        decision: "rejected",
        severity: 90,
        confidence: 0.90,
        categories: {
          ...buildSafeCategories(),
          violence: { triggered: true, severity: 85, confidence: 0.90 },
          nsfw:     { triggered: true, severity: 90, confidence: 0.90 },
        },
        explanation: `Video rejected by Gemini safety filters (${response.promptFeedback.blockReason}). Likely contains extremely harmful visual or audio content.`,
        needsHumanReview: true,
        aiModel: "gemini-1.5-flash",
      };
    }

    const responseText = response.text();
    if (!responseText) {
      throw new Error("AI returned an empty response for video analysis");
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
    console.error("[VideoPipeline] Error:", error.message);

    // Safe fallback — never fabricate severity/violations on error
    // Route to human review with unknown severity (0 / confidence 0)
    return {
      decision: "needs_human_review",
      severity: 0,
      confidence: 0.0,
      categories: buildSafeCategories(),
      explanation: `Video analysis failed (${error.message}). Routed to human review — AI analysis was not completed.`,
      needsHumanReview: true,
      aiModel: "aegis-fallback-v1",
    };
  }
}
