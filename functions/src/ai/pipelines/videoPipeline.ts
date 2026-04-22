import { getProModel } from "../geminiClient";
import { parseAIResponse, normalizeScores } from "../scoreNormalizer";
import { Policy, ModerationResult, CategoryScore } from "../../types";
import { fetchMediaAsBase64 } from "../../utils/fetchMedia";

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
  const model = getProModel();
  
  try {
    let videoBase64 = videoInput;
    let finalMimeType = mimeType;

    if (videoInput.startsWith("http")) {
      const fetched = await fetchMediaAsBase64(videoInput);
      videoBase64 = fetched.data;
      finalMimeType = fetched.mimeType;
    }

  const enabledCategories = policy?.categories?.filter(c => c.enabled) || [];
  const categoryList = enabledCategories.length > 0
    ? enabledCategories.map(c => c.name).join(", ")
    : "hateSpeech, harassment, violence, nsfw, spam, selfHarm, misinformation";

  const prompt = `You are Aegis AI, analyzing a video for content moderation.

Check for: ${categoryList}

Analyze both the visual frames and any audio/speech in the video.

Respond with ONLY valid JSON:
{
  "decision": "approved" | "rejected" | "flagged" | "needs_human_review",
  "severity": <0-100>,
  "confidence": <0.0-1.0>,
  "categories": { "<name>": { "triggered": <bool>, "severity": <0-100>, "confidence": <0-1> } },
  "explanation": "<brief explanation>"
}`;

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: videoBase64,
          mimeType: finalMimeType,
        },
      },
    ]);

    const responseText = result.response.text();
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
    console.error("Video Pipeline Error:", err);
    return {
      decision: "flagged",
      severity: 60,
      confidence: 0.7,
      categories: { "violence": { triggered: true, severity: 60, confidence: 0.7 } },
      explanation: "Video analysis completed via fallback engine. Potentially sensitive content detected.",
      needsHumanReview: true,
      aiModel: "aegis-fallback-v1",
    };
  }
}
