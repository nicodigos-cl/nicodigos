import "server-only";

import { eld } from "eld/large";
import pLimit from "p-limit";

import { createStructuredResponse } from "@/lib/openai/client";
import { AI_TRANSLATE_CONCURRENCY } from "@/lib/smm-services/constants";

export const PRODUCT_TRANSLATE_FIELDS = [
  "name",
  "description",
  "platform",
  "regionalLimitations",
  "activationDetails",
  "genres",
  "languages",
] as const;

export type ProductTranslateField = (typeof PRODUCT_TRANSLATE_FIELDS)[number];

export type ProductTranslateFields = Partial<
  Record<ProductTranslateField, string>
>;

const FIELD_LABELS: Record<ProductTranslateField, string> = {
  name: "título",
  description: "descripción",
  platform: "plataforma",
  regionalLimitations: "limitaciones regionales",
  activationDetails: "detalles de activación",
  genres: "géneros (lista separada por comas)",
  languages: "idiomas (lista separada por comas)",
};

const DESCRIPTION_MAX = 12_000;
const SHORT_MAX = 1_500;
/** Below this, brand/SKU noise makes detectors unreliable. */
const MIN_DETECT_LENGTH = 10;

/**
 * Detect English product copy with ELD (`eld/large`).
 * Skips empty/short strings and non-English (incl. Spanish without accents).
 */
export function needsProductTranslation(
  text: string | null | undefined,
): boolean {
  const value = text?.trim() ?? "";
  if (value.length < MIN_DETECT_LENGTH) return false;

  // Fast path: clear Spanish orthography → skip OpenAI.
  if (/[áéíóúüñÁÉÍÓÚÜÑ¿¡]/.test(value)) return false;

  // Titles like "Fortnite - 1000 V-Bucks Cuenta de Epic Games" are already ES.
  const spanishHints = (
    value.match(
      /\b(de|la|el|los|las|un|una|para|con|por|del|al|clave|tarjeta|cuenta|prepaga|suscripcion|mes|ano|año|descarga|digital|regalo|pack|conjunto)\b/gi,
    ) ?? []
  ).length;
  if (spanishHints >= 2) return false;

  // SKU-style titles dominated by game brands (no prose) — leave as-is.
  const words = value
    .split(/[^a-zA-Z0-9áéíóúüñÁÉÍÓÚÜÑ+-]+/)
    .map((w) => w.trim())
    .filter((w) => w.length > 1);
  const brandHits = (
    value.match(
      /\b(fortnite|xbox|epic|games|steam|v-?bucks|roblox|robux|league|legends|nintendo|playstation|microsoft|windows|office|discord|nitro|duolingo|crunchyroll)\b/gi,
    ) ?? []
  ).length;
  if (
    words.length >= 3 &&
    brandHits / words.length >= 0.45 &&
    !/[.!?]/.test(value)
  ) {
    return false;
  }

  const result = eld.detect(value);
  if (result.language !== "en") return false;

  // Short titles need a reliable hit; long descriptions can proceed if EN wins.
  if (value.length < 28) return result.isReliable();
  return result.isReliable() || value.length >= 80;
}

function clip(value: string, max: number): string {
  const text = value.trim();
  if (text.length <= max) return text;
  return `${text.slice(0, max)}…`;
}

function normalizeInput(
  fields: ProductTranslateFields,
  only?: ProductTranslateField[],
): ProductTranslateFields {
  const keys = only?.length
    ? only.filter((field) => PRODUCT_TRANSLATE_FIELDS.includes(field))
    : PRODUCT_TRANSLATE_FIELDS;

  const next: ProductTranslateFields = {};
  for (const key of keys) {
    const value = fields[key]?.trim() ?? "";
    if (!value) continue;
    next[key] =
      key === "description" ? clip(value, DESCRIPTION_MAX) : clip(value, SHORT_MAX);
  }
  return next;
}

type AiPayload = {
  fields: Record<string, string>;
};

/**
 * Translate selected product text fields to LatAm Spanish via OpenAI.
 * Returns only fields that were translated (empty/already-Spanish skipped unless force).
 */
export async function translateProductFields(
  fields: ProductTranslateFields,
  options?: { only?: ProductTranslateField[]; force?: boolean },
): Promise<ProductTranslateFields> {
  const normalized = normalizeInput(fields, options?.only);
  const toSend: ProductTranslateFields = {};

  for (const [key, value] of Object.entries(normalized) as Array<
    [ProductTranslateField, string]
  >) {
    if (options?.force || needsProductTranslation(value)) {
      toSend[key] = value;
    }
  }

  if (Object.keys(toSend).length === 0) {
    return {};
  }

  const fieldKeys = Object.keys(toSend) as ProductTranslateField[];
  const fieldHints = fieldKeys
    .map((key) => `${key} (${FIELD_LABELS[key]})`)
    .join(", ");

  const instructions = [
    "Traduce al español neutro latinoamericano textos de un producto digital (keys, software, juegos, SMM).",
    `Campos a traducir: ${fieldHints}.`,
    "Mantén marcas, plataformas y nombres propios (Steam, Xbox, PlayStation, Microsoft, Windows, Instagram, etc.) cuando no tengan traducción habitual.",
    "Para genres y languages: responde como lista separada por comas, sin inventar ítems.",
    "Preserva saltos de línea y formato básico de description cuando existan.",
    "Si un campo viene vacío, no lo inventes.",
    "Devuelve exactamente las mismas claves recibidas en fields, con el texto traducido.",
    "Responde solo con el JSON estructurado solicitado.",
  ].join(" ");

  const properties: Record<string, unknown> = {};
  for (const key of fieldKeys) {
    properties[key] = { type: "string" };
  }

  const schema = {
    type: "object" as const,
    additionalProperties: false as const,
    required: ["fields"],
    properties: {
      fields: {
        type: "object",
        additionalProperties: false,
        required: fieldKeys,
        properties,
      },
    },
  };

  const result = await createStructuredResponse<AiPayload>({
    schemaName: "product_fields_translate",
    instructions,
    input: JSON.stringify({ fields: toSend }),
    schema,
  });

  const translated: ProductTranslateFields = {};
  for (const key of fieldKeys) {
    const value = result.fields[key]?.trim();
    if (value) translated[key] = value;
  }
  return translated;
}

export type BulkProductTranslateItem = {
  productId: string;
  fields: ProductTranslateFields;
};

/**
 * Translate many products with p-limit concurrency (one product payload per call).
 */
export async function translateProductFieldsBulk(
  items: BulkProductTranslateItem[],
  options?: { only?: ProductTranslateField[]; force?: boolean },
): Promise<Map<string, ProductTranslateFields>> {
  const translateLimit = pLimit(AI_TRANSLATE_CONCURRENCY);
  const out = new Map<string, ProductTranslateFields>();

  await Promise.all(
    items.map((item) =>
      translateLimit(async () => {
        const translated = await translateProductFields(item.fields, options);
        if (Object.keys(translated).length > 0) {
          out.set(item.productId, translated);
        }
      }),
    ),
  );

  return out;
}
