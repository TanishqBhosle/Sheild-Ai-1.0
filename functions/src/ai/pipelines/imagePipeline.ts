/**
 * Image Moderation Pipeline
 * Analyzes images using Gemini 1.5 Flash Vision.
 * Falls back to a safe-but-cautious response if the AI API is unavailable.
 */
import { getFlashModel } from "../geminiClient";
import { buildImagePrompt } from "../promptFactory";
import { parseAIResponse, normalizeScores } from "../scoreNormalizer";
import { Policy, ModerationResult, CategoryScore } from "../../types";
import { fetchMediaAsBase64 } from "../../utils/fetchMedia";

export async function runImagePipeline(
  imageInput: string,
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
  const prompt = buildImagePrompt(policy);

  try {
    let imageBase64 = imageInput;
    let finalMimeType = mimeType;

    // Fetch remote images and convert to base64
    if (imageInput.startsWith("http")) {
      const fetched = await fetchMediaAsBase64(imageInput);
      imageBase64 = fetched.data;
      finalMimeType = fetched.mimeType;
    }

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: imageBase64,
          mimeType: finalMimeType,
        },
      },
    ]);

    const response = result.response;

    // If safety filters block the response, it likely means the content IS harmful
    if (response.promptFeedback?.blockReason) {
      console.warn("[ImagePipeline] Gemini blocked response:", response.promptFeedback.blockReason);
      return {
        decision: "rejected",
        severity: 90,
        confidence: 0.95,
        categories: {
          hateSpeech:     { triggered: false, severity: 0,  confidence: 0.95 },
          harassment:     { triggered: false, severity: 0,  confidence: 0.95 },
          violence:       { triggered: true,  severity: 80, confidence: 0.90 },
          nsfw:           { triggered: true,  severity: 90, confidence: 0.95 },
          illegalContent: { triggered: false, severity: 0,  confidence: 0.95 },
          spam:           { triggered: false, severity: 0,  confidence: 0.95 },
          selfHarm:       { triggered: false, severity: 0,  confidence: 0.95 },
          misinformation: { triggered: false, severity: 0,  confidence: 0.95 },
        },
        explanation: `Image rejected by Gemini safety filters (${response.promptFeedback.blockReason}). Likely contains explicit or harmful content.`,
        needsHumanReview: true,
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
    console.error("[ImagePipeline] Error:", error.message);

    // SAFE FALLBACK: Do NOT fabricate severity 100 across all categories.
    // Instead, flag for human review with unknown severity — this is honest and avoids false positives.
    return {
      decision: "needs_human_review",
      severity: 0,
      confidence: 0.0,
      categories: {
        hateSpeech:     { triggered: false, severity: 0, confidence: 0.0 },
        harassment:     { triggered: false, severity: 0, confidence: 0.0 },
        violence:       { triggered: false, severity: 0, confidence: 0.0 },
        nsfw:           { triggered: false, severity: 0, confidence: 0.0 },
        illegalContent: { triggered: false, severity: 0, confidence: 0.0 },
        spam:           { triggered: false, severity: 0, confidence: 0.0 },
        selfHarm:       { triggered: false, severity: 0, confidence: 0.0 },
        misinformation: { triggered: false, severity: 0, confidence: 0.0 },
      },
      explanation: `Image analysis failed (${error.message}). Routed to human review — AI analysis was not completed.`,
      needsHumanReview: true,
      aiModel: "aegis-fallback-v1",
    };
  }
}
