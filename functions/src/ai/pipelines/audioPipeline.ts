/**
 * Audio Moderation Pipeline
 * Step 1: Transcribe audio content using Gemini 1.5 Flash multimodal.
 * Step 2: Run the transcription through the text moderation prompt.
 * Falls back to needs_human_review on any error (never fabricates violations).
 */
import { getFlashModel } from "../geminiClient";
import { buildAudioTranscriptionPrompt, buildAudioModerationPrompt } from "../promptFactory";
import { parseAIResponse, normalizeScores } from "../scoreNormalizer";
import { Policy, ModerationResult, CategoryScore } from "../../types";
import { fetchMediaAsBase64 } from "../../utils/fetchMedia";

// Safe baseline categories when falling back
function buildSafeCategories(): Record<string, CategoryScore> {
  return {
    hateSpeech:     { triggered: false, severity: 0, confidence: 0.0 },
    harassment:     { triggered: false, severity: 0, confidence: 0.0 },
    violence:       { triggered: false, severity: 0, confidence: 0.0 },
    spam:           { triggered: false, severity: 0, confidence: 0.0 },
    nsfw:           { triggered: false, severity: 0, confidence: 0.0 },
    illegalContent: { triggered: false, severity: 0, confidence: 0.0 },
    selfHarm:       { triggered: false, severity: 0, confidence: 0.0 },
    misinformation: { triggered: false, severity: 0, confidence: 0.0 },
  };
}

export async function runAudioPipeline(
  audioInput: string,
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
  transcription?: string;
}> {
  const model = getFlashModel();

  try {
    let audioBase64 = audioInput;
    let finalMimeType = mimeType;

    // Fetch remote audio and convert to base64 if needed
    if (audioInput.startsWith("http")) {
      const fetched = await fetchMediaAsBase64(audioInput);
      audioBase64 = fetched.data;
      finalMimeType = fetched.mimeType;
    }

    // ── STEP 1: Transcribe audio ───────────────────────────────────────────────
    const transcriptionPrompt = buildAudioTranscriptionPrompt();
    const transcriptionResult = await model.generateContent([
      transcriptionPrompt,
      {
        inlineData: {
          data: audioBase64,
          mimeType: finalMimeType,
        },
      },
    ]);

    // Check if safety filters blocked the transcription
    if (transcriptionResult.response.promptFeedback?.blockReason) {
      console.warn("[AudioPipeline] Transcription blocked:", transcriptionResult.response.promptFeedback.blockReason);
      return {
        decision: "rejected",
        severity: 85,
        confidence: 0.90,
        categories: {
          ...buildSafeCategories(),
          hateSpeech: { triggered: true, severity: 80, confidence: 0.85 },
          violence:   { triggered: true, severity: 85, confidence: 0.90 },
        },
        explanation: `Audio blocked by safety filters (${transcriptionResult.response.promptFeedback.blockReason}). Likely contains severely harmful speech.`,
        needsHumanReview: true,
        aiModel: "gemini-1.5-flash",
      };
    }

    const transcription = transcriptionResult.response.text()?.trim();

    if (!transcription) {
      throw new Error("Transcription returned empty response");
    }

    // If no speech detected, approve immediately
    if (
      transcription.includes("[No speech detected") ||
      transcription.includes("[Audio inaudible")
    ) {
      return {
        decision: "approved",
        severity: 0,
        confidence: 0.95,
        categories: buildSafeCategories().constructor === Object
          ? Object.fromEntries(
              Object.entries(buildSafeCategories()).map(([k, v]) => [k, { ...v, confidence: 0.95 }])
            )
          : buildSafeCategories(),
        explanation: `Audio contains no detectable speech. ${transcription}`,
        needsHumanReview: false,
        aiModel: "gemini-1.5-flash",
        transcription,
      };
    }

    // ── STEP 2: Moderate the transcription ────────────────────────────────────
    const moderationPrompt = buildAudioModerationPrompt(transcription, policy);
    const moderationResult = await model.generateContent(moderationPrompt);

    // Check if safety filters blocked the moderation
    if (moderationResult.response.promptFeedback?.blockReason) {
      return {
        decision: "rejected",
        severity: 90,
        confidence: 0.90,
        categories: {
          ...buildSafeCategories(),
          violence:   { triggered: true, severity: 90, confidence: 0.90 },
          hateSpeech: { triggered: true, severity: 85, confidence: 0.85 },
        },
        explanation: `Audio content rejected by safety filters after transcription. Likely contains extremely harmful speech.`,
        needsHumanReview: false,
        aiModel: "gemini-1.5-flash",
        transcription,
      };
    }

    const responseText = moderationResult.response.text();
    if (!responseText) {
      throw new Error("Moderation returned empty response");
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
      transcription,
    };
  } catch (error: any) {
    console.error("[AudioPipeline] Error:", error.message);

    // Safe fallback — never fabricate violations, always defer to human review
    return {
      decision: "needs_human_review",
      severity: 0,
      confidence: 0.0,
      categories: buildSafeCategories(),
      explanation: `Audio analysis failed (${error.message}). Routed to human review — AI analysis was not completed.`,
      needsHumanReview: true,
      aiModel: "aegis-fallback-v1",
    };
  }
}
