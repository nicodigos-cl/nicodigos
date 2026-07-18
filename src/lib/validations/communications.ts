import { z } from "zod";

const email = z.string().trim().email().max(320).transform((value) => value.toLowerCase());
const cuid = z.string().cuid();

export const communicationKindSchema = z.enum([
  "OPERATIONAL",
  "MARKETING",
  "SECURITY",
  "SUPPORT",
  "SYSTEM",
]);

export const safePublicUrlSchema = z
  .string()
  .trim()
  .max(2_048)
  .url()
  .refine((value) => ["https:", "http:"].includes(new URL(value).protocol), {
    message: "Usa una URL http o https válida.",
  });

export const emailAddressListSchema = z.array(email).max(50).default([]);

export const emailContentSchema = z
  .string()
  .trim()
  .min(1, "Escribe un mensaje.")
  .max(50_000, "El mensaje es demasiado largo.");

const baseEmailSchema = z.object({
  idempotencyKey: z.string().uuid(),
  to: z.array(email).min(1, "Agrega al menos un destinatario.").max(50),
  cc: emailAddressListSchema,
  bcc: emailAddressListSchema,
  subject: z.string().trim().min(1).max(200),
  content: emailContentSchema,
  kind: communicationKindSchema.exclude(["SYSTEM"]),
  templateVersionId: cuid.optional(),
});

export const saveEmailDraftSchema = baseEmailSchema.extend({
  messageId: cuid.optional(),
  threadId: cuid.optional(),
});

export const sendEmailSchema = baseEmailSchema.extend({
  messageId: cuid.optional(),
  threadId: cuid.optional(),
  confirmMassSend: z.literal("ENVIAR").optional(),
}).superRefine((value, context) => {
  const recipients = new Set([...value.to, ...value.cc, ...value.bcc]).size;
  if (recipients > 10 && value.confirmMassSend !== "ENVIAR") {
    context.addIssue({
      code: "custom",
      path: ["confirmMassSend"],
      message: "Escribe ENVIAR para confirmar este envío.",
    });
  }
});

export const threadListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(10).max(100).default(20),
  q: z.string().trim().max(200).optional(),
  mailbox: z.enum(["inbox", "sent", "drafts", "archived", "spam"]).default("inbox"),
  state: z.enum(["unread", "pending", "answered", "mine", "unassigned"]).optional(),
  priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]).optional(),
  userId: cuid.optional(),
  orderId: cuid.optional(),
  category: z.string().trim().max(80).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

export const threadIdSchema = z.object({ threadId: cuid });
export const markThreadReadSchema = threadIdSchema.extend({ read: z.boolean() });
export const assignThreadSchema = threadIdSchema.extend({
  assignedUserId: z.string().min(1).max(200).nullable(),
});
export const updateThreadStatusSchema = threadIdSchema.extend({
  status: z.enum(["OPEN", "PENDING", "RESOLVED", "ARCHIVED", "SPAM"]),
});
export const createInternalNoteSchema = threadIdSchema.extend({
  content: z.string().trim().min(2).max(4_000),
});

export const webPushDataSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("ORDER"), orderId: cuid }),
  z.object({ type: z.literal("DELIVERY"), deliveryId: cuid }),
  z.object({ type: z.literal("PRODUCT"), productId: cuid }),
  z.object({ type: z.literal("GENERAL") }),
]);

export const audienceDefinitionSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("ALL_ELIGIBLE") }),
  z.object({ type: z.literal("SPECIFIC_USERS"), userIds: z.array(cuid).min(1).max(2_000) }),
  z.object({ type: z.literal("INTERNAL_SEGMENT"), segmentId: cuid }),
  z.object({ type: z.literal("ONESIGNAL_SEGMENT"), segment: z.string().trim().min(1).max(100) }),
]);

const pushButtonSchema = z.object({
  id: z.string().trim().regex(/^[a-z0-9_-]{1,32}$/),
  text: z.string().trim().min(1).max(30),
  url: safePublicUrlSchema,
});

export const webPushDraftSchema = z.object({
  notificationId: cuid.optional(),
  idempotencyKey: z.string().uuid(),
  name: z.string().trim().min(3).max(120),
  title: z.string().trim().min(1).max(80),
  body: z.string().trim().min(1).max(240),
  kind: communicationKindSchema.exclude(["SUPPORT", "SYSTEM"]),
  targetUrl: safePublicUrlSchema.optional().or(z.literal("")),
  iconUrl: safePublicUrlSchema.optional().or(z.literal("")),
  imageUrl: safePublicUrlSchema.optional().or(z.literal("")),
  buttons: z.array(pushButtonSchema).max(2).default([]),
  data: webPushDataSchema,
  audience: audienceDefinitionSchema,
  language: z.enum(["es", "en"]).default("es"),
  priority: z.coerce.number().int().min(1).max(10).default(5),
  ttlSeconds: z.coerce.number().int().min(60).max(2_419_200).optional(),
  scheduledAt: z.coerce.date().optional(),
});

export const pushListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(10).max(100).default(20),
  q: z.string().trim().max(200).optional(),
  status: z.enum(["DRAFT", "SCHEDULED", "QUEUED", "SENDING", "SENT", "PARTIALLY_SENT", "FAILED", "CANCELLED", "ARCHIVED"]).optional(),
  kind: communicationKindSchema.optional(),
});

export const pushIdSchema = z.object({ notificationId: cuid });
export const schedulePushSchema = pushIdSchema.extend({
  idempotencyKey: z.string().uuid(),
  scheduledAt: z.coerce.date().refine((date) => date.getTime() >= Date.now() + 5 * 60_000, {
    message: "Programa con al menos cinco minutos de anticipación.",
  }),
});
export const sendPushNowSchema = pushIdSchema.extend({
  idempotencyKey: z.string().uuid(),
  confirmation: z.literal("ENVIAR"),
});

export const communicationTemplateVariableSchema = z.enum([
  "user.firstName",
  "order.number",
  "order.total",
  "delivery.url",
  "product.name",
  "support.email",
]);

export const templateSchema = z.object({
  templateId: cuid.optional(),
  name: z.string().trim().min(3).max(120),
  slug: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(120),
  channel: z.enum(["EMAIL", "WEB_PUSH"]),
  kind: communicationKindSchema,
  status: z.enum(["DRAFT", "ACTIVE"]),
  subject: z.string().trim().max(200).optional(),
  title: z.string().trim().max(80).optional(),
  content: z.string().trim().min(1).max(50_000),
  variables: z.array(communicationTemplateVariableSchema).max(12).default([]),
  changeReason: z.string().trim().max(300).optional(),
}).superRefine((value, context) => {
  if (value.channel === "EMAIL" && !value.subject) {
    context.addIssue({ code: "custom", path: ["subject"], message: "El asunto es obligatorio." });
  }
  if (value.channel === "WEB_PUSH" && !value.title) {
    context.addIssue({ code: "custom", path: ["title"], message: "El título es obligatorio." });
  }
});

export const preferenceSchema = z.object({
  marketingEmail: z.boolean(),
  webPushEnabled: z.boolean(),
  orders: z.boolean(),
  payments: z.boolean(),
  deliveries: z.boolean(),
  smm: z.boolean(),
  security: z.boolean(),
  newProducts: z.boolean(),
  promotions: z.boolean(),
});

export const pushSubscriptionStateSchema = z.object({
  permissionStatus: z.enum(["UNSUPPORTED", "DEFAULT", "GRANTED", "DENIED", "UNAVAILABLE"]),
  optedIn: z.boolean(),
  subscriptionId: z.string().trim().min(1).max(500).nullable(),
  browser: z.string().trim().max(80).optional(),
  platform: z.string().trim().max(80).optional(),
});

export type AudienceDefinition = z.infer<typeof audienceDefinitionSchema>;
export type WebPushData = z.infer<typeof webPushDataSchema>;
export type PreferenceInput = z.infer<typeof preferenceSchema>;
