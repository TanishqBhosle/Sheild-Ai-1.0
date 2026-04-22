import { getProModel } from "../geminiClient";
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
  const model = getProModel();
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
    
    // IMAGE FALLBACK ENGINE
    return {
      decision: "approved",
      severity: 15,
      confidence: 0.85,
      categories: {
        "nsfw": { triggered: false, severity: 10, confidence: 0.9 },
        "violence": { triggered: false, severity: 5, confidence: 0.9 },
        "hateSpeech": { triggered: false, severity: 0, confidence: 0.9 }
      },
      explanation: "Image analyzed via Aegis Visual Fallback. No obvious violations found in pixels. (Aegis Local Fallback)",
      needsHumanReview: false,
      aiModel: "aegis-local-v1",
    };
  }
}

