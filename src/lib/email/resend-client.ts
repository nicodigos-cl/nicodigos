import "server-only";

import type { ReactElement } from "react";
import { Resend, type Attachment, type CreateEmailOptions, type WebhookEventPayload } from "resend";

import { createLogger } from "@/lib/logger";
import { safeError } from "@/lib/communications/security";

const log = createLogger({ module: "resend-client" });
let client: Resend | null = null;

export function isResendConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim() && process.env.RESEND_FROM?.trim());
}

export function getResendClient(): Resend | null {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) return null;
  client ??= new Resend(key);
  return client;
}

export function requireResendClient(): Resend {
  const resend = getResendClient();
  if (!resend) throw new Error("RESEND_NOT_CONFIGURED");
  return resend;
}

export function getVerifiedFromAddress(): string {
  const from = process.env.RESEND_FROM?.trim();
  if (!from) throw new Error("RESEND_FROM_NOT_CONFIGURED");
  return from;
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs = 15_000): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error("RESEND_TIMEOUT")), timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export async function sendWithResend(input: {
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  text: string;
  react?: ReactElement;
  replyTo?: string;
  idempotencyKey: string;
  tags?: Array<{ name: string; value: string }>;
  attachments?: Attachment[];
}) {
  const payload: CreateEmailOptions = {
    from: getVerifiedFromAddress(),
    to: input.to,
    cc: input.cc?.length ? input.cc : undefined,
    bcc: input.bcc?.length ? input.bcc : undefined,
    subject: input.subject,
    text: input.text,
    react: input.react,
    replyTo: input.replyTo,
    tags: input.tags,
    attachments: input.attachments,
  };
  const startedAt = Date.now();
  try {
    const response = await withTimeout(
      requireResendClient().emails.send(payload, { idempotencyKey: input.idempotencyKey }),
    );
    if (response.error || !response.data?.id) throw new Error(response.error?.message ?? "RESEND_EMPTY_RESPONSE");
    log.info({ operation: "send", provider: "RESEND", recipientCount: input.to.length, durationMs: Date.now() - startedAt, result: "accepted", externalId: `…${response.data.id.slice(-8)}` }, "Email accepted by Resend");
    return response.data;
  } catch (error) {
    log.error({ operation: "send", provider: "RESEND", recipientCount: input.to.length, durationMs: Date.now() - startedAt, errorCode: safeError(error) }, "Email send failed");
    throw error;
  }
}

export function verifyResendWebhook(payload: string, headers: Headers): WebhookEventPayload {
  const secret = process.env.RESEND_WEBHOOK_SECRET?.trim();
  if (!secret) throw new Error("RESEND_WEBHOOK_SECRET_NOT_CONFIGURED");
  return requireResendClient().webhooks.verify({
    payload,
    headers: {
      id: headers.get("svix-id") ?? "",
      timestamp: headers.get("svix-timestamp") ?? "",
      signature: headers.get("svix-signature") ?? "",
    },
    webhookSecret: secret,
  });
}
