import { getProModel } from "../geminiClient";
import { buildModerationPrompt } from "../promptFactory";
import { parseAIResponse, normalizeScores } from "../scoreNormalizer";
import { Policy, ModerationResult, CategoryScore } from "../../types";

export async function runAudioPipeline(
  audioBase64: string,
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
  const model = getProModel();

  // Step 1: Transcribe audio using Gemini Pro
  const transcriptionResult = await model.generateContent([
    "Transcribe the following audio content. Return ONLY the transcription text, nothing else.",
    {
      inlineData: {
        data: audioBase64,
        mimeType: mimeType,
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
    aiModel: "gemini-1.5-pro",
  };
}
