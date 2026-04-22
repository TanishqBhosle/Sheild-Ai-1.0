import { Router, Request, Response } from "express";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { runTextPipeline } from "../ai/pipelines/textPipeline";
import { runImagePipeline } from "../ai/pipelines/imagePipeline";
import { processAsyncModeration } from "../workers/asyncModerationWorker";
import { incrementUsage } from "../utils/firestoreHelpers";
import { dispatchWebhook } from "../workers/webhookDispatcher";
import { Policy, Organization, ContentType, ModerateResponse, AsyncModerateResponse } from "../types";
import { v4 as uuidv4 } from "uuid";

const router = Router();

// POST /v1/moderate
router.post("/", async (req: Request, res: Response) => {
  const startTime = Date.now();
  const requestId = res.getHeader("X-Request-Id") as string || uuidv4();

  try {
    const ctx = req.authContext;
    if (!ctx) {
      res.status(401).json({ error: "Not authenticated", requestId });
      return;
    }

    const { type, text, mediaUrl, externalId, policyId, metadata } = req.body;

    if (!type) {
      res.status(400).json({ error: "type is required", requestId });
      return;
    }

    const db = getFirestore();
    const contentId = `cnt_${uuidv4().substring(0, 8)}`;

    // Determine sync vs async
    const isAsync = type === "audio" || type === "video" || req.body.async === true;

    // Create content document
    const contentRef = db.doc(`organizations/${ctx.orgId}/content/${contentId}`);
    await contentRef.set({
      contentId,
      orgId: ctx.orgId,
      policyId: policyId || null,
      submittedBy: ctx.uid,
      externalId: externalId || null,
      type: type as ContentType,
      text: text || null,
      mediaUrl: mediaUrl || null,
      status: isAsync ? "pending" : "processing",
      metadata: metadata || null,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });

    // Load policy
    let policy: Policy | null = null;
    if (policyId) {
      const policyDoc = await db.doc(`organizations/${ctx.orgId}/policies/${policyId}`).get();
      if (policyDoc.exists) policy = policyDoc.data() as Policy;
    }
    if (!policy) {
      // Try default policy
      const orgDoc = await db.doc(`organizations/${ctx.orgId}`).get();
      const org = orgDoc.data() as Organization;
      if (org?.settings?.defaultPolicyId) {
        const defaultPolicyDoc = await db.doc(`organizations/${ctx.orgId}/policies/${org.settings.defaultPolicyId}`).get();
        if (defaultPolicyDoc.exists) policy = defaultPolicyDoc.data() as Policy;
      }
    }

    if (isAsync) {
      // Async path — queue for processing
      processAsyncModeration(contentId, ctx.orgId).catch(err =>
        console.error("Async moderation error:", err)
      );

      const asyncResponse: AsyncModerateResponse = {
        requestId,
        contentId,
        status: "processing",
        pollUrl: `/v1/results/${contentId}`,
        estimatedCompletionMs: type === "video" ? 600000 : 120000,
      };

      res.status(202).json(asyncResponse);
      return;
    }

    // Sync path — text or small image
    let result;
    if (type === "text") {
      if (!text) {
        res.status(400).json({ error: "text field is required for text moderation", requestId });
        return;
      }
      result = await runTextPipeline(text, policy);
    } else if (type === "image") {
      if (!mediaUrl && !text) {
        res.status(400).json({ error: "mediaUrl or base64 data required for image", requestId });
        return;
      }
      result = await runImagePipeline(mediaUrl || text || "", "image/jpeg", policy);
    } else {
      res.status(400).json({ error: `Unsupported sync type: ${type}`, requestId });
      return;
    }

    const processingMs = Date.now() - startTime;

    // Write moderation result
    const resultRef = db.collection(`organizations/${ctx.orgId}/moderation_results`).doc();
    const batch = db.batch();

    batch.set(resultRef, {
      resultId: resultRef.id,
      contentId,
      orgId: ctx.orgId,
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
    await incrementUsage(ctx.orgId, type);

    // Fire webhook if configured
    const response: ModerateResponse = {
      requestId,
      contentId,
      decision: result.decision,
      severity: result.severity,
      confidence: result.confidence,
      categories: result.categories,
      processingMs,
      explanation: result.explanation,
      status: result.decision, // Compatibility field
    };

    // Fire webhook if configured (background task)
    db.doc(`organizations/${ctx.orgId}`).get().then(orgDoc => {
      const org = orgDoc.data() as Organization;
      if (org?.webhookUrl && org?.webhookSecret) {
        return dispatchWebhook(
          org.webhookUrl,
          org.webhookSecret,
          result.decision === "rejected" ? "moderation.flagged" : "moderation.completed",
          ctx.orgId,
          { contentId, decision: result.decision, severity: result.severity }
        );
      }
      return null;
    }).catch(err => console.error("Webhook dispatch error:", err));

    res.status(200).json(response);

  } catch (err: unknown) {
    const error = err as Error;
    console.error("Moderation error:", error);
    res.status(500).json({ error: "Moderation failed", message: error.message, requestId });
  }
});

export default router;
