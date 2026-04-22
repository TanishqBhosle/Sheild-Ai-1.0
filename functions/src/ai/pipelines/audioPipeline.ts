import { getFlashModel } from "../geminiClient";
import { buildModerationPrompt } from "../promptFactory";
import { parseAIResponse, normalizeScores } from "../scoreNormalizer";
import { Policy, ModerationResult, CategoryScore } from "../../types";
import { fetchMediaAsBase64 } from "../../utils/fetchMedia";

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
}> {
  const model = getFlashModel();

  try {
    let audioBase64 = audioInput;
    let finalMimeType = mimeType;

    if (audioInput.startsWith("http")) {
      const fetched = await fetchMediaAsBase64(audioInput);
      audioBase64 = fetched.data;
      finalMimeType = fetched.mimeType;
    }

    // Step 1: Transcribe audio using Gemini Pro
    const transcriptionResult = await model.generateContent([
      "Transcribe the following audio content. Return ONLY the transcription text, nothing else.",
      {
        inlineData: {
          data: audioBase64,
          mimeType: finalMimeType,
        },
      },
    ]);

  const transcription = transcriptionResult.response.text();

  // Step 2: Run text moderation on the transcription
  const moderationPrompt = buildModerationPrompt(transcription, policy, "audio transcription");
  const moderationResult = await model.generateContent(moderationPrompt);
  const responseText = moderationResult.response.text();
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
  } catch (err) {
    console.error("Audio Pipeline Error:", err);
    throw err;
  }
}
