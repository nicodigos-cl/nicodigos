import { createHmac, timingSafeEqual } from "node:crypto";

import type { SupportWsRole } from "@/lib/support-live/events";

export type SupportWsTicketClaims = {
  userId: string;
  email: string;
  name: string;
  role: SupportWsRole;
  exp: number;
};

const TICKET_TTL_SECONDS = 5 * 60;

function getSecret(): string {
  const secret = process.env.SUPPORT_WS_SECRET?.trim();
  if (!secret) {
    throw new Error("SUPPORT_WS_SECRET is not configured");
  }
  return secret;
}

function base64UrlEncode(value: string | Buffer): string {
  return Buffer.from(value)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function base64UrlDecode(value: string): Buffer {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const pad = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
  return Buffer.from(`${padded}${pad}`, "base64");
}

function signPayload(payloadB64: string, secret: string): string {
  return base64UrlEncode(
    createHmac("sha256", secret).update(payloadB64).digest(),
  );
}

export function mintSupportWsTicket(input: {
  userId: string;
  email: string;
  name: string;
  role: SupportWsRole;
  ttlSeconds?: number;
}): { ticket: string; expiresAt: number } {
  const exp =
    Math.floor(Date.now() / 1000) + (input.ttlSeconds ?? TICKET_TTL_SECONDS);
  const claims: SupportWsTicketClaims = {
    userId: input.userId,
    email: input.email,
    name: input.name || input.email,
    role: input.role,
    exp,
  };
  const payloadB64 = base64UrlEncode(JSON.stringify(claims));
  const signature = signPayload(payloadB64, getSecret());
  return { ticket: `${payloadB64}.${signature}`, expiresAt: exp };
}

export function verifySupportWsTicket(
  ticket: string,
): SupportWsTicketClaims | null {
  try {
    const [payloadB64, signature] = ticket.split(".");
    if (!payloadB64 || !signature) return null;

    const expected = signPayload(payloadB64, getSecret());
    const a = Buffer.from(signature);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

    const claims = JSON.parse(
      base64UrlDecode(payloadB64).toString("utf8"),
    ) as SupportWsTicketClaims;

    if (
      !claims.userId ||
      !claims.email ||
      (claims.role !== "USER" && claims.role !== "ADMIN") ||
      typeof claims.exp !== "number"
    ) {
      return null;
    }

    if (claims.exp < Math.floor(Date.now() / 1000)) return null;
    return claims;
  } catch {
    return null;
  }
}
