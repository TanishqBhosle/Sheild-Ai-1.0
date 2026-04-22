import * as crypto from "crypto";

export function generateApiKey(env: "live" | "test" = "live"): string {
  const hex = crypto.randomBytes(16).toString("hex");
  return `grd_${env}_${hex}`;
}

export function hashApiKey(rawKey: string): string {
  return crypto.createHash("sha256").update(rawKey).digest("hex");
}

export function getKeyPrefix(rawKey: string): string {
  return rawKey.substring(0, 12);
}

export function generateHmacSignature(payload: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

export function verifyHmacSignature(payload: string, secret: string, signature: string): boolean {
  const expected = generateHmacSignature(payload, secret);
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}
