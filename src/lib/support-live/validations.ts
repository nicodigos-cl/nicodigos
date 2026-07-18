import { z } from "zod";

const emptyToUndefined = (value: unknown) =>
  value === "" || value === null || value === undefined ? undefined : value;

export const supportLiveCategories = [
  "payment",
  "delivery",
  "key",
  "smm",
  "refund",
  "account",
  "billing",
  "other",
] as const;

export const openLiveThreadSchema = z.object({
  subject: z.string().trim().min(3).max(160),
  message: z.string().trim().min(1).max(4000),
  orderId: z.preprocess(emptyToUndefined, z.string().cuid().optional()),
  deliveryId: z.preprocess(emptyToUndefined, z.string().cuid().optional()),
  category: z.preprocess(
    emptyToUndefined,
    z.enum(supportLiveCategories).default("other"),
  ),
});

export const sendLiveMessageSchema = z.object({
  threadId: z.string().cuid(),
  message: z.string().trim().min(1).max(4000),
});

export const markLiveThreadReadSchema = z.object({
  threadId: z.string().cuid(),
});

export const liveThreadStatusSchema = z.enum([
  "OPEN",
  "PENDING",
  "RESOLVED",
  "ARCHIVED",
]);

export const updateLiveThreadStatusSchema = z.object({
  threadId: z.string().cuid(),
  status: liveThreadStatusSchema,
});

export function sanitizeLiveMessage(message: string): string {
  return message.replace(/sk_[a-zA-Z0-9]+/g, "[redacted]").slice(0, 4000);
}
