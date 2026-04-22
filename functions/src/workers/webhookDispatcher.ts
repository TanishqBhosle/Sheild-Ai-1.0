import { generateHmacSignature } from "../utils/apiKeyUtils";

interface WebhookPayload {
  event: string;
  timestamp: string;
  orgId: string;
  data: Record<string, unknown>;
}

export async function dispatchWebhook(
  webhookUrl: string,
  webhookSecret: string,
  event: string,
  orgId: string,
  data: Record<string, unknown>,
  maxRetries: number = 3
): Promise<boolean> {
  const payload: WebhookPayload = {
    event,
    timestamp: new Date().toISOString(),
    orgId,
    data,
  };

  const payloadString = JSON.stringify(payload);
  const signature = generateHmacSignature(payloadString, webhookSecret);

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-AegisAI-Signature": `sha256=${signature}`,
          "X-AegisAI-Event": event,
          "User-Agent": "AegisAI-Webhook/1.0",
        },
        body: payloadString,
      });

      if (response.ok || response.status < 500) {
        return true;
      }

      // Retry on 5xx
      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    } catch (err) {
      console.error(`Webhook delivery attempt ${attempt + 1} failed:`, err);
      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  return false;
}
