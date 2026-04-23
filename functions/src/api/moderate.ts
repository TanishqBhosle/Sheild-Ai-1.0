import { Router, Request, Response } from "express";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { runTextPipeline } from "../ai/pipelines/textPipeline";
import { runImagePipeline } from "../ai/pipelines/imagePipeline";
import { processAsyncModeration } from "../workers/asyncModerationWorker";
import { incrementUsage, writeAuditLog } from "../utils/firestoreHelpers";
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

    const { type, text: rawText, mediaUrl: rawMediaUrl, externalId, policyId, metadata, content: rawContent } = req.body;

    // Backwards compatibility: frontend may send `content` instead of `text` / `mediaUrl`
    const text = rawText || (type === 'text' ? rawContent : undefined);
    const mediaUrl = rawMediaUrl || (type !== 'text' ? rawContent : undefined);

    if (!type) {
      res.status(400).json({ error: "type is required", requestId });
      return;
    }

    const db = getFirestore();
    const contentId = `cnt_${uuidv4().substring(0, 8)}`;

    // Determine sync vs async
    const isAsync = type === "audio" || type === "video" || req.body.async === true;

    // Create content document (Flat)
    const contentRef = db.doc(`content/${contentId}`);
    await contentRef.set({
      contentId,
      orgId: "global",
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
      processAsyncModeration(contentId).catch(err =>
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

    // 1. MAP AI DECISION TO STATUS
    // Allow -> Approved, Flag -> Flagged, Block -> Rejected
    let status: "Approved" | "Flagged" | "Rejected" = "Approved";
    if (result.decision === "rejected") status = "Rejected";
    else if (result.decision === "flagged" || result.needsHumanReview) status = "Flagged";
    else status = "Approved";

    // 2. SAVE EVERY RESULT TO DB
    const resultRef = db.collection("moderation_results").doc();
    const batch = db.batch();

    const moderationData = {
      resultId: resultRef.id,
      contentId,
      orgId: "global",
      decision: result.decision,
      status: status, // New status field for moderator panel
      type: type,     // Content type for display
      severity: result.severity,
      confidence: result.confidence,
      categories: result.categories,
      explanation: result.explanation,
      aiModel: result.aiModel,
      promptVersion: "1.1",
      processingMs,
      needsHumanReview: result.needsHumanReview || status === "Flagged",
      createdAt: Timestamp.now(),
      submittedBy: ctx.uid,
    };

    batch.set(resultRef, moderationData);

    const newContentStatus = status === "Approved" ? "completed" : "queued_for_review";
    batch.update(contentRef, {
      status: newContentStatus,
      processedAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });

    await batch.commit();
    await incrementUsage(type); 

    // 3. AUDIT LOG
    await writeAuditLog({
      actor: ctx.uid, actorEmail: ctx.email,
      action: "content.moderated", resourceType: "content", resourceId: contentId,
      after: { status, severity: result.severity }
    });

    const response: ModerateResponse = {
      requestId,
      contentId,
      decision: result.decision,
      severity: result.severity,
      confidence: result.confidence,
      categories: result.categories,
      processingMs,
      explanation: result.explanation,
      status: result.decision,
    };

    // Fire webhook background (Skipping org-specific webhooks in flat mode for now)
    /*
    db.doc(`platform/settings`).get().then(doc => {
      const settings = doc.data();
      if (settings?.webhookUrl) {
        dispatchWebhook(settings.webhookUrl, settings.webhookSecret, 
          status === "Rejected" ? "moderation.flagged" : "moderation.completed",
          "global", { contentId, decision: result.decision, status }
        ).catch(err => console.error("Webhook dispatch error:", err));
      }
    });
    */

    res.status(200).json(response);

  } catch (err: unknown) {
    const error = err as Error;
    console.error("Moderation error:", error);
    res.status(500).json({ error: "Moderation failed", message: error.message, requestId });
  }
});


export default router;
