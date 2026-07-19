import { createHmac, timingSafeEqual } from "node:crypto";

export type OrderWsTicketClaims = {
  /** Discriminator so the shared live-ws gateway can route the socket. */
  scope: "order";
  userId: string;
  email: string;
  orderId: string;
  role: "USER" | "ADMIN";
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

export function mintOrderWsTicket(input: {
  userId: string;
  email: string;
  orderId: string;
  role: "USER" | "ADMIN";
  ttlSeconds?: number;
}): { ticket: string; expiresAt: number } {
  const exp =
    Math.floor(Date.now() / 1000) + (input.ttlSeconds ?? TICKET_TTL_SECONDS);
  const claims: OrderWsTicketClaims = {
    scope: "order",
    userId: input.userId,
    email: input.email,
    orderId: input.orderId,
    role: input.role,
    exp,
  };
  const payloadB64 = base64UrlEncode(JSON.stringify(claims));
  const signature = signPayload(payloadB64, getSecret());
  return { ticket: `${payloadB64}.${signature}`, expiresAt: exp };
}

export function verifyOrderWsTicket(
  ticket: string,
): OrderWsTicketClaims | null {
  try {
    const [payloadB64, signature] = ticket.split(".");
    if (!payloadB64 || !signature) return null;

    const expected = signPayload(payloadB64, getSecret());
    const a = Buffer.from(signature);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

    const claims = JSON.parse(
      base64UrlDecode(payloadB64).toString("utf8"),
    ) as OrderWsTicketClaims;

    if (
      claims.scope !== "order" ||
      !claims.userId ||
      !claims.email ||
      !claims.orderId ||
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
