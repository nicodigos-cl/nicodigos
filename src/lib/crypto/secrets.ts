import "server-only";

import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

import { maskSecret } from "@/lib/crypto/mask";

export { maskSecret };

const ALGO = "aes-256-gcm";
const IV_LENGTH = 12;

function resolveKey(): Buffer {
  const raw = process.env.DELIVERY_SECRETS_KEY?.trim();
  if (!raw) {
    throw new Error(
      "Missing DELIVERY_SECRETS_KEY. Set a 32+ character secret for delivery credential encryption.",
    );
  }
  // Derive a stable 32-byte key from the env secret.
  return createHash("sha256").update(raw).digest();
}

/**
 * Authenticated encryption (AES-256-GCM).
 * Format: base64(iv).base64(authTag).base64(ciphertext)
 */
export function encryptSecret(plaintext: string): string {
  const key = resolveKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGO, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString("base64")}.${authTag.toString("base64")}.${encrypted.toString("base64")}`;
}

export function decryptSecret(payload: string): string {
  const key = resolveKey();
  const parts = payload.split(".");
  if (parts.length !== 3) {
    throw new Error("Invalid encrypted secret payload.");
  }
  const [ivB64, tagB64, dataB64] = parts;
  const iv = Buffer.from(ivB64, "base64");
  const authTag = Buffer.from(tagB64, "base64");
  const data = Buffer.from(dataB64, "base64");
  const decipher = createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);
  return decrypted.toString("utf8");
}

export function hasDeliverySecretsKey(): boolean {
  return Boolean(process.env.DELIVERY_SECRETS_KEY?.trim());
}
