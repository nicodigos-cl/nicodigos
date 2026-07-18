import { z } from "zod";

import { isValidRut, normalizeRut } from "@/lib/validations/rut";

export const userRoleValues = ["USER", "ADMIN"] as const;
export const userAccountStatusValues = [
  "ACTIVE",
  "RESTRICTED",
  "SUSPENDED",
  "ANONYMIZED",
] as const;
export const invoiceDocumentTypeValues = ["BOLETA", "FACTURA"] as const;
export const userAdminNoteCategoryValues = [
  "SUPPORT",
  "RISK",
  "FRAUD",
  "BILLING",
  "DELIVERY",
  "REFUND",
  "OTHER",
] as const;
export const userAdminNotePriorityValues = [
  "LOW",
  "MEDIUM",
  "HIGH",
  "CRITICAL",
] as const;
export const userSortValues = [
  "createdAt",
  "lastActivityAt",
  "name",
  "orderCount",
  "totalSpent",
  "transactionCount",
  "deliveryCount",
] as const;
export const userDetailSectionValues = [
  "resumen",
  "pedidos",
  "transacciones",
  "entregas",
  "perfil",
  "facturacion",
  "seguridad",
  "actividad",
  "notas",
] as const;

export const userRoleLabel: Record<(typeof userRoleValues)[number], string> = {
  USER: "Usuario",
  ADMIN: "Administrador",
};

export const userAccountStatusLabel: Record<
  (typeof userAccountStatusValues)[number],
  string
> = {
  ACTIVE: "Activa",
  RESTRICTED: "Restringida",
  SUSPENDED: "Bloqueada",
  ANONYMIZED: "Anonimizada",
};

export const userAdminNoteCategoryLabel: Record<
  (typeof userAdminNoteCategoryValues)[number],
  string
> = {
  SUPPORT: "Soporte",
  RISK: "Riesgo",
  FRAUD: "Fraude",
  BILLING: "Facturación",
  DELIVERY: "Entrega",
  REFUND: "Reembolso",
  OTHER: "Otro",
};

export const userAdminNotePriorityLabel: Record<
  (typeof userAdminNotePriorityValues)[number],
  string
> = {
  LOW: "Baja",
  MEDIUM: "Media",
  HIGH: "Alta",
  CRITICAL: "Crítica",
};

const emptyToUndefined = (value: unknown) =>
  value === "" || value === null || value === undefined ? undefined : value;

const boolFromSearch = (value: unknown) => {
  if (value === "" || value === null || value === undefined) return undefined;
  if (value === true || value === "true" || value === "1") return true;
  if (value === false || value === "false" || value === "0") return false;
  return value;
};

const optionalDate = z.preprocess(
  emptyToUndefined,
  z
    .string()
    .refine((value) => !Number.isNaN(Date.parse(value)), "Fecha inválida")
    .optional(),
);

const optionalMoney = z.preprocess(
  emptyToUndefined,
  z.coerce.number().nonnegative().max(999_999_999).optional(),
);

export const userIdSchema = z
  .string()
  .trim()
  .min(1, "Usuario inválido")
  .max(128, "Usuario inválido");

export const usersListQuerySchema = z
  .object({
    page: z.preprocess(
      emptyToUndefined,
      z.coerce.number().int().min(1).default(1),
    ),
    pageSize: z.preprocess(
      emptyToUndefined,
      z.coerce
        .number()
        .int()
        .refine((value) => [10, 20, 50, 100].includes(value), "Tamaño inválido")
        .default(20),
    ),
    q: z.preprocess(
      emptyToUndefined,
      z
        .string()
        .trim()
        .max(160)
        .transform((value) => value.replace(/\s+/g, " "))
        .optional(),
    ),
    role: z.preprocess(emptyToUndefined, z.enum(userRoleValues).optional()),
    accountStatus: z.preprocess(
      emptyToUndefined,
      z.enum(userAccountStatusValues).optional(),
    ),
    emailVerified: z.preprocess(boolFromSearch, z.boolean().optional()),
    withOrders: z.preprocess(boolFromSearch, z.boolean().optional()),
    withoutOrders: z.preprocess(boolFromSearch, z.boolean().optional()),
    withApprovedPurchases: z.preprocess(boolFromSearch, z.boolean().optional()),
    withFailedPayments: z.preprocess(boolFromSearch, z.boolean().optional()),
    withPendingDeliveries: z.preprocess(boolFromSearch, z.boolean().optional()),
    withCompleteBilling: z.preprocess(boolFromSearch, z.boolean().optional()),
    withRut: z.preprocess(boolFromSearch, z.boolean().optional()),
    registeredFrom: optionalDate,
    registeredTo: optionalDate,
    activeFrom: optionalDate,
    activeTo: optionalDate,
    minSpent: optionalMoney,
    maxSpent: optionalMoney,
    requiresReview: z.preprocess(boolFromSearch, z.boolean().optional()),
    adminsOnly: z.preprocess(boolFromSearch, z.boolean().optional()),
    blockedOnly: z.preprocess(boolFromSearch, z.boolean().optional()),
    sort: z.preprocess(
      emptyToUndefined,
      z.enum(userSortValues).default("createdAt"),
    ),
    order: z.preprocess(
      emptyToUndefined,
      z.enum(["asc", "desc"]).default("desc"),
    ),
  })
  .superRefine((value, ctx) => {
    if (
      value.minSpent != null &&
      value.maxSpent != null &&
      value.minSpent > value.maxSpent
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["maxSpent"],
        message: "El gasto máximo debe ser mayor o igual al mínimo",
      });
    }
    if (
      value.registeredFrom &&
      value.registeredTo &&
      Date.parse(value.registeredFrom) > Date.parse(value.registeredTo)
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["registeredTo"],
        message: "La fecha final de registro debe ser posterior a la inicial",
      });
    }
    if (
      value.activeFrom &&
      value.activeTo &&
      Date.parse(value.activeFrom) > Date.parse(value.activeTo)
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["activeTo"],
        message: "La fecha final de actividad debe ser posterior a la inicial",
      });
    }
    if (value.withOrders && value.withoutOrders) {
      ctx.addIssue({
        code: "custom",
        path: ["withoutOrders"],
        message: "No puedes combinar con pedidos y sin pedidos",
      });
    }
  });

export type UsersListQuery = z.infer<typeof usersListQuerySchema>;

export const userDetailQuerySchema = z.object({
  section: z.preprocess(
    emptyToUndefined,
    z.enum(userDetailSectionValues).default("resumen"),
  ),
  page: z.preprocess(
    emptyToUndefined,
    z.coerce.number().int().min(1).default(1),
  ),
  pageSize: z.preprocess(
    emptyToUndefined,
    z.coerce
      .number()
      .int()
      .refine((value) => [10, 20, 50].includes(value), "Tamaño inválido")
      .default(10),
  ),
});

export type UserDetailQuery = z.infer<typeof userDetailQuerySchema>;

const reasonSchema = z.string().trim().min(5).max(1000);

export const updateUserProfileSchema = z.object({
  userId: userIdSchema,
  name: z.string().trim().min(1).max(120),
  phone: z
    .string()
    .trim()
    .max(40)
    .optional()
    .transform((value) => (value && value.length > 0 ? value : null)),
  reason: reasonSchema,
});

export const updateUserBillingSchema = z
  .object({
    userId: userIdSchema,
    rut: z
      .string()
      .trim()
      .max(20)
      .optional()
      .transform((value) => {
        if (!value) return null;
        return normalizeRut(value);
      }),
    invoiceType: z.enum(invoiceDocumentTypeValues),
    businessName: z
      .string()
      .trim()
      .max(200)
      .optional()
      .transform((value) => (value && value.length > 0 ? value : null)),
    businessActivity: z
      .string()
      .trim()
      .max(200)
      .optional()
      .transform((value) => (value && value.length > 0 ? value : null)),
    addressLine1: z
      .string()
      .trim()
      .max(200)
      .optional()
      .transform((value) => (value && value.length > 0 ? value : null)),
    addressLine2: z
      .string()
      .trim()
      .max(200)
      .optional()
      .transform((value) => (value && value.length > 0 ? value : null)),
    commune: z
      .string()
      .trim()
      .max(120)
      .optional()
      .transform((value) => (value && value.length > 0 ? value : null)),
    city: z
      .string()
      .trim()
      .max(120)
      .optional()
      .transform((value) => (value && value.length > 0 ? value : null)),
    region: z
      .string()
      .trim()
      .max(120)
      .optional()
      .transform((value) => (value && value.length > 0 ? value : null)),
    reason: reasonSchema,
  })
  .superRefine((value, ctx) => {
    if (value.rut != null && !isValidRut(value.rut)) {
      ctx.addIssue({
        code: "custom",
        path: ["rut"],
        message: "RUT inválido",
      });
    }
    if (value.invoiceType === "FACTURA") {
      if (!value.businessName) {
        ctx.addIssue({
          code: "custom",
          path: ["businessName"],
          message: "La razón social es obligatoria para factura",
        });
      }
      if (!value.businessActivity) {
        ctx.addIssue({
          code: "custom",
          path: ["businessActivity"],
          message: "El giro es obligatorio para factura",
        });
      }
      if (!value.rut) {
        ctx.addIssue({
          code: "custom",
          path: ["rut"],
          message: "El RUT es obligatorio para factura",
        });
      }
    }
  });

export const changeUserRoleSchema = z.object({
  userId: userIdSchema,
  role: z.enum(userRoleValues),
  reason: reasonSchema,
  confirmation: z.literal("CAMBIAR_ROL"),
});

export const suspendUserSchema = z.object({
  userId: userIdSchema,
  mode: z.enum(["RESTRICTED", "SUSPENDED"]),
  reason: reasonSchema,
  endsAt: z.preprocess(
    emptyToUndefined,
    z.string().datetime().optional(),
  ),
  revokeSessions: z.boolean().default(true),
  confirmation: z.literal("SUSPENDER"),
});

export const restoreUserSchema = z.object({
  userId: userIdSchema,
  reason: reasonSchema,
  confirmation: z.literal("REHABILITAR"),
});

export const revokeUserSessionSchema = z.object({
  userId: userIdSchema,
  sessionId: userIdSchema,
  reason: reasonSchema.optional().default("Revocación administrativa"),
});

export const revokeAllUserSessionsSchema = z.object({
  userId: userIdSchema,
  reason: reasonSchema,
  confirmation: z.literal("REVOCAR_SESIONES"),
  keepCurrentAdminSession: z.boolean().default(false),
});

export const sendPasswordResetSchema = z.object({
  userId: userIdSchema,
  reason: reasonSchema,
});

export const sendEmailVerificationSchema = z.object({
  userId: userIdSchema,
  reason: reasonSchema,
});

export const createUserAdminNoteSchema = z.object({
  userId: userIdSchema,
  category: z.enum(userAdminNoteCategoryValues),
  priority: z
    .enum(userAdminNotePriorityValues)
    .default("MEDIUM"),
  content: z.string().trim().min(1).max(4000),
});

export const updateUserAdminNoteSchema = z.object({
  noteId: z.string().cuid("Nota inválida"),
  category: z.enum(userAdminNoteCategoryValues),
  priority: z.enum(userAdminNotePriorityValues),
  content: z.string().trim().min(1).max(4000),
});

export const resolveUserAdminNoteSchema = z.object({
  noteId: z.string().cuid("Nota inválida"),
});

export const reopenUserAdminNoteSchema = z.object({
  noteId: z.string().cuid("Nota inválida"),
});

export const deleteUserAdminNoteSchema = z.object({
  noteId: z.string().cuid("Nota inválida"),
  confirmation: z.literal("ELIMINAR_NOTA"),
});

export const markUserReviewSchema = z.object({
  userId: userIdSchema,
  reason: reasonSchema,
});

export const resolveUserReviewSchema = z.object({
  userId: userIdSchema,
  reason: reasonSchema,
});

export const anonymizeUserSchema = z.object({
  userId: userIdSchema,
  reason: z.string().trim().min(10).max(1000),
  confirmation: z.literal("ANONIMIZAR"),
});

export const unlinkOAuthAccountSchema = z.object({
  userId: userIdSchema,
  accountId: userIdSchema,
  reason: reasonSchema,
  confirmation: z.literal("DESVINCULAR"),
});

export const exportUsersSchema = usersListQuerySchema.safeExtend({
  confirmation: z.literal("EXPORTAR"),
});
