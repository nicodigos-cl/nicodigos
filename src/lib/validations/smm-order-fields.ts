import { z } from "zod";

export const smmOrderFieldKeys = [
  "link",
  "username",
  "quantity",
  "comments",
  "runs",
  "intervalMinutes",
  "usernames",
  "hashtags",
  "mediaUrl",
  "min",
  "max",
  "delayMinutes",
  "posts",
  "oldPosts",
  "expiry",
  "answerNumber",
] as const;

export type SmmOrderFieldKey = (typeof smmOrderFieldKeys)[number];

export type SmmServiceKind =
  | "default"
  | "package"
  | "custom_comments"
  | "mentions_hashtags"
  | "mentions_custom"
  | "mentions_user_followers"
  | "mentions_media_likers"
  | "subscriptions"
  | "comment_likes"
  | "poll"
  | "unknown";

export type SmmFieldSpec = {
  key: SmmOrderFieldKey;
  required: boolean;
  label: string;
  input:
    | "url"
    | "text"
    | "textarea"
    | "number"
    | "delay";
  placeholder?: string;
  hint?: string;
};

const SUBSCRIPTION_DELAYS = [
  0, 5, 10, 15, 20, 30, 40, 50, 60, 90, 120, 150, 180, 210, 240, 270, 300, 360,
  420, 480, 540, 600,
] as const;

function emptyToUndefined(value: unknown): unknown {
  if (value === "" || value === null || value === undefined) {
    return undefined;
  }
  return value;
}

const optionalPositiveInt = z.preprocess(
  emptyToUndefined,
  z.coerce.number().int().min(1).max(10_000_000).optional(),
);

const requiredPositiveInt = z.preprocess(
  emptyToUndefined,
  z.coerce.number().int().min(1, "Cantidad inválida").max(10_000_000),
);

const optionalNonNegInt = z.preprocess(
  emptyToUndefined,
  z.coerce.number().int().min(0).max(10_000_000).optional(),
);

const optionalUrl = z.preprocess(
  emptyToUndefined,
  z.string().trim().url("URL inválida").max(2000).optional(),
);

const requiredUrl = z.preprocess(
  emptyToUndefined,
  z.string().trim().url("Ingresa una URL válida").max(2000),
);

const optionalText = z.preprocess(
  emptyToUndefined,
  z.string().trim().min(1).max(2000).optional(),
);

const requiredText = (message: string) =>
  z.preprocess(
    emptyToUndefined,
    z.string().trim().min(1, message).max(2000),
  );

const optionalLongText = z.preprocess(
  emptyToUndefined,
  z.string().trim().min(1).max(20_000).optional(),
);

const requiredLongText = z.preprocess(
  emptyToUndefined,
  z.string().trim().min(1, "Este campo es obligatorio").max(20_000),
);

/** Normalize panel service type strings to a stable kind. */
export function normalizeSmmServiceKind(
  serviceType: string | null | undefined,
): SmmServiceKind {
  const raw = (serviceType ?? "").trim().toLowerCase();
  if (!raw) return "unknown";

  if (raw === "default" || raw.includes("drip")) return "default";
  if (raw === "package" || raw.includes("package")) return "package";
  if (raw.includes("custom comment") || raw === "custom comments") {
    return "custom_comments";
  }
  if (raw.includes("mention") && raw.includes("hashtag")) {
    return "mentions_hashtags";
  }
  if (
    raw.includes("mention") &&
    (raw.includes("custom") || raw.includes("list"))
  ) {
    return "mentions_custom";
  }
  if (raw.includes("mention") && raw.includes("follower")) {
    return "mentions_user_followers";
  }
  if (raw.includes("mention") && (raw.includes("media") || raw.includes("liker"))) {
    return "mentions_media_likers";
  }
  if (raw.includes("subscription") || raw === "subscriptions") {
    return "subscriptions";
  }
  if (raw.includes("comment like")) return "comment_likes";
  if (raw.includes("poll")) return "poll";
  if (raw === "default") return "default";

  return "unknown";
}

const FIELD_META: Record<SmmOrderFieldKey, Omit<SmmFieldSpec, "key" | "required">> = {
  link: {
    label: "Enlace de destino",
    input: "url",
    placeholder: "https://...",
    hint: "URL completa de la publicación o perfil.",
  },
  username: {
    label: "Usuario",
    input: "text",
    placeholder: "nombre_de_usuario",
  },
  quantity: {
    label: "Cantidad",
    input: "number",
  },
  comments: {
    label: "Comentarios",
    input: "textarea",
    hint: "Un comentario por línea.",
  },
  runs: {
    label: "Repeticiones (drip-feed)",
    input: "number",
  },
  intervalMinutes: {
    label: "Intervalo (minutos)",
    input: "number",
  },
  usernames: {
    label: "Lista de usuarios",
    input: "textarea",
    hint: "Un usuario por línea.",
  },
  hashtags: {
    label: "Hashtags",
    input: "textarea",
    hint: "Un hashtag por línea.",
  },
  mediaUrl: {
    label: "URL del media",
    input: "url",
    placeholder: "https://...",
  },
  min: {
    label: "Mínimo por publicación",
    input: "number",
  },
  max: {
    label: "Máximo por publicación",
    input: "number",
  },
  delayMinutes: {
    label: "Retraso (minutos)",
    input: "delay",
  },
  posts: {
    label: "Publicaciones nuevas",
    input: "number",
  },
  oldPosts: {
    label: "Publicaciones antiguas",
    input: "number",
  },
  expiry: {
    label: "Expiración",
    input: "text",
    placeholder: "dd/mm/yyyy",
    hint: "Fecha de fin de la suscripción (opcional).",
  },
  answerNumber: {
    label: "Número de respuesta",
    input: "text",
  },
};

type KindConfig = {
  required: SmmOrderFieldKey[];
  optional: SmmOrderFieldKey[];
};

const KIND_CONFIG: Record<SmmServiceKind, KindConfig> = {
  default: {
    required: ["link", "quantity"],
    optional: ["runs", "intervalMinutes"],
  },
  package: {
    required: ["link"],
    optional: [],
  },
  custom_comments: {
    required: ["link", "comments"],
    optional: [],
  },
  mentions_hashtags: {
    required: ["link", "quantity", "usernames", "hashtags"],
    optional: [],
  },
  mentions_custom: {
    required: ["link", "usernames"],
    optional: [],
  },
  mentions_user_followers: {
    required: ["link", "quantity", "username"],
    optional: [],
  },
  mentions_media_likers: {
    required: ["link", "quantity", "mediaUrl"],
    optional: [],
  },
  subscriptions: {
    required: ["username", "min", "max", "delayMinutes"],
    optional: ["posts", "oldPosts", "expiry"],
  },
  comment_likes: {
    required: ["link", "quantity", "username"],
    optional: [],
  },
  poll: {
    required: ["link", "quantity", "answerNumber"],
    optional: [],
  },
  unknown: {
    required: ["link", "quantity"],
    optional: [],
  },
};

export function requiredSmmFieldsForType(
  serviceType: string | null | undefined,
): SmmFieldSpec[] {
  const kind = normalizeSmmServiceKind(serviceType);
  const config = KIND_CONFIG[kind];
  return [
    ...config.required.map((key) => ({
      key,
      required: true,
      ...FIELD_META[key],
    })),
    ...config.optional.map((key) => ({
      key,
      required: false,
      ...FIELD_META[key],
    })),
  ];
}

export const smmOrderFieldsPayloadSchema = z.object({
  link: optionalUrl,
  username: optionalText,
  quantity: optionalPositiveInt,
  comments: optionalLongText,
  runs: optionalPositiveInt,
  intervalMinutes: optionalNonNegInt,
  usernames: optionalLongText,
  hashtags: optionalLongText,
  mediaUrl: optionalUrl,
  min: optionalPositiveInt,
  max: optionalPositiveInt,
  delayMinutes: z.preprocess(
    emptyToUndefined,
    z.coerce
      .number()
      .int()
      .refine(
        (value) =>
          (SUBSCRIPTION_DELAYS as readonly number[]).includes(value),
        { message: "Retraso no válido" },
      )
      .optional(),
  ),
  posts: optionalPositiveInt,
  oldPosts: optionalNonNegInt,
  expiry: optionalText,
  answerNumber: optionalText,
});

export type SmmOrderFieldsPayload = z.infer<typeof smmOrderFieldsPayloadSchema>;

export function parseSmmOrderFieldsForType(
  serviceType: string | null | undefined,
  raw: unknown,
):
  | { success: true; data: SmmOrderFieldsPayload }
  | { success: false; error: z.ZodError } {
  const kind = normalizeSmmServiceKind(serviceType);
  const config = KIND_CONFIG[kind];
  const base = smmOrderFieldsPayloadSchema.safeParse(raw ?? {});
  if (!base.success) {
    return { success: false, error: base.error };
  }

  const data = base.data;
  const issues: z.ZodIssue[] = [];

  for (const key of config.required) {
    const value = data[key];
    const missing =
      value === undefined ||
      value === null ||
      (typeof value === "string" && value.trim() === "");
    if (missing) {
      issues.push({
        code: "custom",
        path: [key],
        message: `${FIELD_META[key].label} es obligatorio`,
      });
    }
  }

  if (
    data.min != null &&
    data.max != null &&
    data.min > data.max
  ) {
    issues.push({
      code: "custom",
      path: ["max"],
      message: "El máximo debe ser mayor o igual al mínimo",
    });
  }

  if (issues.length > 0) {
    return {
      success: false,
      error: new z.ZodError(issues),
    };
  }

  return { success: true, data };
}

export function isSmmOrderFieldsComplete(
  serviceType: string | null | undefined,
  payload: SmmOrderFieldsPayload | null | undefined,
): boolean {
  if (!payload) return false;
  return parseSmmOrderFieldsForType(serviceType, payload).success;
}

export function cartLineQuantityFromSmm(
  serviceType: string | null | undefined,
  fields: SmmOrderFieldsPayload,
  fallback = 1,
): number {
  const kind = normalizeSmmServiceKind(serviceType);
  if (kind === "package") return 1;
  if (kind === "subscriptions") return 1;
  if (fields.quantity != null && fields.quantity >= 1) return fields.quantity;
  return fallback;
}

/** Schemas used when the product type is known at compile time (stricter). */
export const smmDefaultOrderFieldsSchema = z.object({
  link: requiredUrl,
  quantity: requiredPositiveInt,
  runs: optionalPositiveInt,
  intervalMinutes: optionalNonNegInt,
});

export const smmPackageOrderFieldsSchema = z.object({
  link: requiredUrl,
});

export const smmCustomCommentsOrderFieldsSchema = z.object({
  link: requiredUrl,
  comments: requiredLongText,
});

export { SUBSCRIPTION_DELAYS };
