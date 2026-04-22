import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { runTextPipeline } from "../ai/pipelines/textPipeline";
import { runImagePipeline } from "../ai/pipelines/imagePipeline";
import { runAudioPipeline } from "../ai/pipelines/audioPipeline";
import { runVideoPipeline } from "../ai/pipelines/videoPipeline";
import { Content, Policy } from "../types";
import { incrementUsage } from "../utils/firestoreHelpers";

export async function processAsyncModeration(contentId: string, orgId: string): Promise<void> {
  const db = getFirestore();
  const contentRef = db.doc(`organizations/${orgId}/content/${contentId}`);
  const contentDoc = await contentRef.get();

  if (!contentDoc.exists) {
    console.error(`Content ${contentId} not found for org ${orgId}`);
    return;
  }

  const content = contentDoc.data() as Content;

  // Update status to processing
  await contentRef.update({ status: "processing", updatedAt: Timestamp.now() });

  // Load policy if specified
  let policy: Policy | null = null;
  if (content.policyId) {
    const policyDoc = await db.doc(`organizations/${orgId}/policies/${content.policyId}`).get();
    if (policyDoc.exists) {
      policy = policyDoc.data() as Policy;
    }
  }

  try {
    let result;
    const startTime = Date.now();

    switch (content.type) {
      case "text":
        result = await runTextPipeline(content.text || "", policy);
        break;
      case "image": {
        // For async images, download from storage and convert to base64
        const imageData = content.mediaUrl || "";
        result = await runImagePipeline(imageData, "image/jpeg", policy);
        break;
      }
      case "audio": {
        const audioData = content.mediaUrl || "";
        result = await runAudioPipeline(audioData, "audio/mpeg", policy);
        break;
      }
      case "video": {
        const videoData = content.mediaUrl || "";
        result = await runVideoPipeline(videoData, "video/mp4", policy);
        break;
      }
      default:
        throw new Error(`Unsupported content type: ${content.type}`);
    }

    const processingMs = Date.now() - startTime;

    // Write moderation result
    const resultRef = db.collection(`organizations/${orgId}/moderation_results`).doc();
    const batch = db.batch();

    batch.set(resultRef, {
      resultId: resultRef.id,
      contentId,
      orgId,
      decision: result.decision,
      severity: result.severity,
      confidence: result.confidence,
      categories: result.categories,
      explanation: result.explanation,
      aiModel: result.aiModel,
      promptVersion: "1.0",
      processingMs,
      needsHumanReview: result.needsHumanReview,
      createdAt: Timestamp.now(),
    });

    const newStatus = result.needsHumanReview ? "queued_for_review" : "completed";
    batch.update(contentRef, {
      status: newStatus,
      processedAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });

    await batch.commit();
    await incrementUsage(orgId, content.type);

  } catch (err) {
    console.error(`Async moderation failed for ${contentId}:`, err);
    await contentRef.update({
      status: "failed",
      updatedAt: Timestamp.now(),
    });
  }
}
