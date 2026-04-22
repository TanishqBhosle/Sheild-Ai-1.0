import { getProModel } from "../geminiClient";
import { buildImagePrompt } from "../promptFactory";
import { parseAIResponse, normalizeScores } from "../scoreNormalizer";
import { Policy, ModerationResult, CategoryScore } from "../../types";

export async function runImagePipeline(
  imageBase64: string,
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
  const prompt = buildImagePrompt(policy);

  const result = await model.generateContent([
    prompt,
    {
      inlineData: {
        data: imageBase64,
        mimeType: mimeType,
      },
    },
  ]);

  const response = result.response;
  const responseText = response.text();
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
