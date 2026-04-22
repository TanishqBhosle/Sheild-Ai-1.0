import { Router, Request, Response } from "express";
import { getFirestore } from "firebase-admin/firestore";
import { dispatchWebhook } from "../workers/webhookDispatcher";

const router = Router();

// POST /v1/webhooks/test
router.post("/test", async (req: Request, res: Response) => {
  try {
    const ctx = req.authContext;
    if (!ctx) { res.status(401).json({ error: "Not authenticated" }); return; }

    const db = getFirestore();
    const orgDoc = await db.doc(`organizations/${ctx.orgId}`).get();
    const org = orgDoc.data();

    if (!org?.webhookUrl || !org?.webhookSecret) {
      res.status(400).json({ error: "No webhook URL or secret configured" });
      return;
    }

    const success = await dispatchWebhook(
      org.webhookUrl,
      org.webhookSecret,
      "test.ping",
      ctx.orgId,
      { message: "Test webhook from Aegis AI", timestamp: new Date().toISOString() }
    );

    res.json({ success, message: success ? "Test webhook delivered" : "Webhook delivery failed" });
  } catch (err: unknown) {
    const error = err as Error;
    res.status(500).json({ error: error.message });
  }
});

// PATCH /v1/webhooks/config
router.patch("/config", async (req: Request, res: Response) => {
  try {
    const ctx = req.authContext;
    if (!ctx) { res.status(401).json({ error: "Not authenticated" }); return; }

    const { webhookUrl, webhookSecret } = req.body;
    const db = getFirestore();

    await db.doc(`organizations/${ctx.orgId}`).update({
      webhookUrl: webhookUrl || null,
      webhookSecret: webhookSecret || null,
    });

    res.json({ success: true });
  } catch (err: unknown) {
    const error = err as Error;
    res.status(500).json({ error: error.message });
  }
});

export default router;
