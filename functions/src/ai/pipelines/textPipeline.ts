import { getFlashModel } from "../geminiClient";
import { buildModerationPrompt } from "../promptFactory";
import { parseAIResponse, normalizeScores } from "../scoreNormalizer";
import { Policy, ModerationResult, CategoryScore } from "../../types";

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

  const result = await model.generateContent(prompt);
  const response = result.response;
  const responseText = response.text();

  const raw = parseAIResponse(responseText);

  // Build sensitivity map from policy
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
}
