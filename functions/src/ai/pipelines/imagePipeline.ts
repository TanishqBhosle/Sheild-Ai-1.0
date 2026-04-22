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
    console.error("Image Pipeline Error:", error.message);
    
    // IMAGE FALLBACK ENGINE - Safety First
    return {
      decision: "flagged",
      severity: 100,
      confidence: 1.0,
      categories: {
        "nsfw": { triggered: true, severity: 100, confidence: 1.0 },
        "violence": { triggered: true, severity: 100, confidence: 1.0 },
        "hateSpeech": { triggered: true, severity: 100, confidence: 1.0 }
      },
      explanation: "Image analysis was interrupted or blocked. Flagged for mandatory human review to ensure safety. (Aegis Local Safety Fallback)",
      needsHumanReview: true,
      aiModel: "aegis-local-safety-v1",
    };
  }
}
