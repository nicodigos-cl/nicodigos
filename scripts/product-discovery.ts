/**
 * Discover Kinguin products from AI-generated search terms, translate to ES,
 * import as ACTIVE into the catalog DB pointed by the loaded env.
 *
 * Pipeline por producto (concurrente): fetch → translate → category → import+ACTIVE
 *
 * CUIDADO: escribe en la DB del env cargado (típicamente producción).
 *
 *   bun --env-file .env.production --conditions=react-server \
 *     scripts/product-discovery.ts "battlefield" --limit=20
 *
 * Flags:
 *   --limit=N              max products to import (default 100)
 *   --terms-per-seed=N     AI queries per seed (default 8)
 *   --page-size=10|20|50   hits per Kinguin search (default 20)
 *   --concurrency=N        pipeline workers (default IMPORT_CONCURRENCY)
 *
 * Markup: random 35–45% per product.
 * Category: AI selects an existing one or creates a new Spanish catalog category.
 */
import * as readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

import { ProductStatus } from "@/generated/prisma/client";
import { eurToClp } from "@/lib/fx/eur-clp";
import { getKinguinClient } from "@/lib/kinguin-client";
import { importKinguinProduct } from "@/lib/kinguin/import";
import {
  invalidateKinguinSearchCache,
  searchKinguinProducts,
} from "@/lib/kinguin/search";
import { createStructuredResponse } from "@/lib/openai/client";
import prisma from "@/lib/prisma";
import { slugify } from "@/lib/products/format";
import {
  translateProductFields,
  type ProductTranslateFields,
} from "@/lib/products/translate-fields";
import { IMPORT_CONCURRENCY } from "@/lib/smm-services/constants";
import type { KinguinSearchHitDto } from "@/types/kinguin-admin";
import pLimit from "p-limit";

const CONFIRM_TOKEN = "PUBLICAR";
const MARKUP_MIN_PCT = 35;
const MARKUP_MAX_PCT = 45;
const DEFAULT_LIMIT = 100;

const startedAt = Date.now();

type CliOptions = {
  seeds: string[];
  limit: number;
  termsPerSeed: number;
  pageSize: 10 | 20 | 50;
  concurrency: number;
};

type CatalogCategory = {
  id: string;
  name: string;
  slug: string;
  parentName: string | null;
};

function log(
  phase: string,
  data: Record<string, unknown> = {},
  level: "info" | "warn" | "error" = "info",
): void {
  const payload = {
    ts: new Date().toISOString(),
    elapsedMs: Date.now() - startedAt,
    phase,
    ...data,
  };
  const line = JSON.stringify(payload);
  if (level === "error") {
    console.error(line);
  } else if (level === "warn") {
    console.warn(line);
  } else {
    console.log(line);
  }
}

function parseIntFlag(name: string, fallback: number): number {
  const arg = process.argv.find((item) => item.startsWith(`${name}=`));
  if (!arg) return fallback;
  const value = Number.parseInt(arg.split("=")[1] ?? "", 10);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function parsePageSize(): 10 | 20 | 50 {
  const raw = parseIntFlag("--page-size", 20);
  if (raw === 10 || raw === 20 || raw === 50) return raw;
  return 20;
}

function parseCli(): CliOptions {
  const seeds = process.argv
    .slice(2)
    .filter((arg) => !arg.startsWith("--"))
    .map((arg) => arg.trim())
    .filter(Boolean);

  return {
    seeds,
    limit: parseIntFlag("--limit", DEFAULT_LIMIT),
    termsPerSeed: parseIntFlag("--terms-per-seed", 8),
    pageSize: parsePageSize(),
    concurrency: parseIntFlag("--concurrency", IMPORT_CONCURRENCY),
  };
}

function randomMarkupPct(min: number, max: number): number {
  const low = Math.min(min, max);
  const high = Math.max(min, max);
  return low + Math.floor(Math.random() * (high - low + 1));
}

function databaseHostLabel(url: string): string {
  try {
    const parsed = new URL(url);
    const port = parsed.port || "5432";
    return `${parsed.hostname}:${port}${parsed.pathname}`;
  } catch {
    return "(DATABASE_URL inválida)";
  }
}

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Falta variable de entorno: ${name}`);
  }
  return value;
}

function assertCriticalEnv(): void {
  log("env-check", { status: "start" });
  requireEnv("DATABASE_URL");
  requireEnv("OPENAI_API_KEY");
  requireEnv("KINGUIN_API_KEY");
  for (const key of [
    "R2_ACCOUNT_ID",
    "R2_ACCESS_KEY_ID",
    "R2_SECRET_ACCESS_KEY",
    "R2_BUCKET",
    "R2_PUBLIC_URL",
  ] as const) {
    requireEnv(key);
  }
  log("env-check", {
    status: "ok",
    database: databaseHostLabel(process.env.DATABASE_URL!.trim()),
    kinguinEnv: process.env.KINGUIN_ENVIRONMENT?.trim() || "(default)",
    openaiModel: process.env.OPENAI_MODEL?.trim() || "gpt-5-nano",
  });
}

function splitCsv(value: string | undefined): string[] | undefined {
  if (value == null) return undefined;
  const parts = value
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean);
  return parts.length > 0 ? parts : undefined;
}

async function confirmProductionWrite(options: CliOptions): Promise<void> {
  const dbUrl = process.env.DATABASE_URL!.trim();
  log(
    "confirm",
    {
      status: "waiting",
      warning: "escritura irreversible; productos ACTIVE",
      database: databaseHostLabel(dbUrl),
      kinguinEnv: process.env.KINGUIN_ENVIRONMENT?.trim() || "(default)",
      openaiModel: process.env.OPENAI_MODEL?.trim() || "gpt-5-nano",
      seeds: options.seeds,
      limit: options.limit,
      termsPerSeed: options.termsPerSeed,
      pageSize: options.pageSize,
      concurrency: options.concurrency,
      markupPctRange: [MARKUP_MIN_PCT, MARKUP_MAX_PCT],
      pipeline: "fetch→translate→category→import+ACTIVE",
      confirmToken: CONFIRM_TOKEN,
    },
    "warn",
  );
  console.error(`Escribe exactamente ${CONFIRM_TOKEN} para continuar:`);

  const rl = readline.createInterface({ input, output });
  try {
    const answer = (await rl.question("> ")).trim();
    if (answer !== CONFIRM_TOKEN) {
      log("confirm", { status: "cancelled", answer }, "error");
      throw new Error(
        `Confirmación cancelada (se esperaba "${CONFIRM_TOKEN}").`,
      );
    }
    log("confirm", { status: "accepted" });
  } finally {
    rl.close();
  }
}

async function generateSearchTerms(
  seed: string,
  termsPerSeed: number,
): Promise<string[]> {
  type AiPayload = { terms: string[] };
  const t0 = Date.now();
  log("ai-terms", { status: "start", seed, termsPerSeed });

  const result = await createStructuredResponse<AiPayload>({
    schemaName: "kinguin_discovery_terms",
    instructions: [
      "Generas términos de búsqueda cortos para el catálogo Kinguin ESA.",
      "Contexto: tienda digital chilena (keys/juegos/software).",
      "A partir de un seed (franquicia, juego, plataforma o tema), expande a consultas simples en inglés",
      'que Kinguin entienda por nombre, p.ej. seed "battlefield" → "battlefield 3", "battlefield 4", "battlefield 1".',
      "Sin marketing, sin frases largas, sin emojis, sin duplicados.",
      "Prioriza títulos/ediciones concretas vendibles; evita genéricos inútiles.",
      `Devuelve como máximo ${termsPerSeed} términos.`,
      "Responde solo con el JSON estructurado solicitado.",
    ].join(" "),
    input: JSON.stringify({ seed, maxTerms: termsPerSeed }),
    schema: {
      type: "object",
      additionalProperties: false,
      required: ["terms"],
      properties: {
        terms: {
          type: "array",
          items: { type: "string" },
        },
      },
    },
  });

  const seen = new Set<string>();
  const terms: string[] = [];
  for (const raw of result.terms) {
    const term = raw.trim().replace(/\s+/g, " ");
    if (!term) continue;
    const key = term.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    terms.push(term);
    if (terms.length >= termsPerSeed) break;
  }

  if (terms.length === 0) {
    terms.push(seed.trim());
    log("ai-terms", { status: "fallback-seed", seed }, "warn");
  }

  log("ai-terms", {
    status: "done",
    seed,
    count: terms.length,
    terms,
    durationMs: Date.now() - t0,
  });
  return terms;
}

async function collectHits(
  terms: string[],
  pageSize: 10 | 20 | 50,
  limit: number,
): Promise<{ hits: KinguinSearchHitDto[]; byTerm: Record<string, number> }> {
  const byId = new Map<number, KinguinSearchHitDto>();
  const byTerm: Record<string, number> = {};
  log("search", { status: "start", terms: terms.length, pageSize, limit });

  for (let index = 0; index < terms.length; index += 1) {
    const term = terms[index]!;
    if (byId.size >= limit) {
      log("search", {
        status: "limit-reached",
        uniqueHits: byId.size,
        remainingTerms: terms.length - index,
      });
      break;
    }

    const t0 = Date.now();
    log("search-term", {
      status: "start",
      index: index + 1,
      of: terms.length,
      term,
      uniqueSoFar: byId.size,
    });

    const page = await searchKinguinProducts({
      q: term,
      page: 1,
      pageSize,
      chile: "compatible",
      imported: "not_imported",
    });

    let added = 0;
    for (const item of page.items) {
      if (byId.has(item.kinguinId)) continue;
      byId.set(item.kinguinId, item);
      added += 1;
      if (byId.size >= limit) break;
    }
    byTerm[term] = added;

    log("search-term", {
      status: "done",
      term,
      apiTotal: page.total,
      pageItems: page.items.length,
      added,
      uniqueHits: byId.size,
      durationMs: Date.now() - t0,
    });
  }

  const hits = [...byId.values()].slice(0, limit);
  log("search", { status: "done", uniqueHits: hits.length, byTerm });
  return { hits, byTerm };
}

async function loadCatalogCategories(): Promise<CatalogCategory[]> {
  const rows = await prisma.category.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
      parent: { select: { name: true } },
    },
    orderBy: [{ name: "asc" }],
  });

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    parentName: row.parent?.name ?? null,
  }));
}

async function createCategoryByName(name: string): Promise<CatalogCategory> {
  const baseSlug = slugify(name) || "categoria";
  log("category-create", { status: "start", name, baseSlug });

  const created = await prisma.$transaction(async (tx) => {
    const siblingAgg = await tx.category.aggregate({
      where: { parentId: null },
      _max: { sortOrder: true },
    });
    const sortOrder = (siblingAgg._max.sortOrder ?? -1) + 1;

    let slug = baseSlug.slice(0, 110);
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const candidate = attempt === 0 ? slug : `${slug}-${attempt + 1}`;
      const existing = await tx.category.findUnique({
        where: { slug: candidate },
        select: { id: true },
      });
      if (!existing) {
        slug = candidate;
        break;
      }
      if (attempt === 19) {
        slug = `${slug}-${Date.now().toString(36)}`;
      }
    }

    return tx.category.create({
      data: {
        name,
        slug,
        parentId: null,
        sortOrder,
      },
      select: { id: true, name: true, slug: true },
    });
  });

  const category = {
    id: created.id,
    name: created.name,
    slug: created.slug,
    parentName: null,
  };
  log("category-create", {
    status: "done",
    id: category.id,
    name: category.name,
    slug: category.slug,
  });
  return category;
}

/** Shared category catalog + create-by-name locks for concurrent pipeline workers. */
class CategoryRegistry {
  private readonly byId = new Map<string, CatalogCategory>();
  private readonly byName = new Map<string, string>();
  private readonly createLocks = new Map<string, Promise<string>>();
  readonly created: CatalogCategory[] = [];

  constructor(initial: CatalogCategory[]) {
    for (const category of initial) {
      this.byId.set(category.id, category);
      this.byName.set(category.name.trim().toLowerCase(), category.id);
    }
  }

  list(): CatalogCategory[] {
    return [...this.byId.values()];
  }

  async resolveFromAi(input: {
    mode: "existing" | "create";
    categoryId: string;
    newName: string;
  }): Promise<{
    categoryId: string;
    mode: "existing" | "create";
    name: string;
  }> {
    if (input.mode === "existing") {
      const id = input.categoryId.trim();
      const existing = this.byId.get(id);
      if (existing) {
        return { categoryId: id, mode: "existing", name: existing.name };
      }
      log(
        "category-assign",
        {
          status: "invalid-existing-id",
          categoryId: id,
          fallback: input.newName || "Otros digitales",
        },
        "warn",
      );
    }

    const name = input.newName.trim() || "Otros digitales";
    const key = name.toLowerCase();
    const known = this.byName.get(key);
    if (known) {
      return { categoryId: known, mode: "create", name };
    }

    let lock = this.createLocks.get(key);
    if (!lock) {
      lock = (async () => {
        const again = this.byName.get(key);
        if (again) return again;
        const category = await createCategoryByName(name);
        this.byId.set(category.id, category);
        this.byName.set(key, category.id);
        this.created.push(category);
        return category.id;
      })();
      this.createLocks.set(key, lock);
    }

    const categoryId = await lock;
    return { categoryId, mode: "create", name };
  }
}

async function assignCategoryForProduct(
  product: {
    kinguinId: number;
    name: string;
    platform: string | null;
    genres: string[];
    tags: string[];
  },
  registry: CategoryRegistry,
): Promise<{ categoryId: string; mode: "existing" | "create"; name: string }> {
  type AiPayload = {
    mode: "existing" | "create";
    categoryId: string;
    newName: string;
  };

  const categories = registry.list();
  const t0 = Date.now();
  log("pipeline-category", {
    status: "start",
    kinguinId: product.kinguinId,
    name: product.name.slice(0, 80),
    catalogSize: categories.length,
  });

  try {
    const result = await createStructuredResponse<AiPayload>({
      schemaName: "kinguin_discovery_category_one",
      instructions: [
        "Asignas UNA categoría de catálogo para una tienda digital chilena (keys/juegos/software).",
        "mode=existing si encaja en una categoría listada (usa su categoryId exacto y newName vacío).",
        'mode=create si ninguna sirve (categoryId vacío; newName en español corto, p.ej. "Juegos Steam").',
        "No inventes categoryId. Prefiere reutilizar categorías existentes cuando sea razonable.",
        "Responde solo con el JSON estructurado solicitado.",
      ].join(" "),
      input: JSON.stringify({
        categories: categories.map((c) => ({
          id: c.id,
          name: c.parentName ? `${c.parentName} · ${c.name}` : c.name,
          slug: c.slug,
        })),
        product: {
          kinguinId: String(product.kinguinId),
          name: product.name,
          platform: product.platform,
          genres: product.genres,
          tags: product.tags,
        },
      }),
      schema: {
        type: "object",
        additionalProperties: false,
        required: ["mode", "categoryId", "newName"],
        properties: {
          mode: { type: "string", enum: ["existing", "create"] },
          categoryId: { type: "string" },
          newName: { type: "string" },
        },
      },
    });

    const resolved = await registry.resolveFromAi(result);
    log("pipeline-category", {
      status: "done",
      kinguinId: product.kinguinId,
      mode: resolved.mode,
      categoryId: resolved.categoryId,
      categoryName: resolved.name,
      durationMs: Date.now() - t0,
    });
    return resolved;
  } catch (error) {
    log(
      "pipeline-category",
      {
        status: "ai-error-fallback",
        kinguinId: product.kinguinId,
        message: error instanceof Error ? error.message.slice(0, 200) : "error",
      },
      "warn",
    );
    const resolved = await registry.resolveFromAi({
      mode: "create",
      categoryId: "",
      newName: "Otros digitales",
    });
    log("pipeline-category", {
      status: "done-fallback",
      kinguinId: product.kinguinId,
      categoryId: resolved.categoryId,
      categoryName: resolved.name,
      durationMs: Date.now() - t0,
    });
    return resolved;
  }
}

async function processHitPipeline(options: {
  hit: KinguinSearchHitDto;
  index: number;
  total: number;
  registry: CategoryRegistry;
}): Promise<
  | {
      ok: true;
      kinguinId: number;
      productId: string;
      markupPct: number;
      categoryId: string;
      name: string;
      durationMs: number;
    }
  | {
      ok: false;
      kinguinId: number;
      message: string;
      step: string;
      durationMs: number;
    }
> {
  const { hit, index, total, registry } = options;
  const t0 = Date.now();
  const client = getKinguinClient();
  const progress = `${index}/${total}`;

  log("pipeline", {
    status: "start",
    progress,
    kinguinId: hit.kinguinId,
    hitName: hit.name.slice(0, 80),
    platform: hit.platform,
    priceEur: hit.priceEur,
  });

  // 1) Fetch
  let remote;
  try {
    log("pipeline-fetch", {
      status: "start",
      progress,
      kinguinId: hit.kinguinId,
    });
    const fetchT0 = Date.now();
    remote = await client.getProductByKinguinId(hit.kinguinId);
    log("pipeline-fetch", {
      status: "done",
      progress,
      kinguinId: hit.kinguinId,
      name: remote.name.slice(0, 80),
      offers: remote.offers?.length ?? 0,
      durationMs: Date.now() - fetchT0,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message.slice(0, 200)
        : "Error al obtener producto";
    log(
      "pipeline-fetch",
      { status: "error", progress, kinguinId: hit.kinguinId, message },
      "error",
    );
    return {
      ok: false,
      kinguinId: hit.kinguinId,
      message,
      step: "fetch",
      durationMs: Date.now() - t0,
    };
  }

  // 2) Translate
  let translated: ProductTranslateFields = {};
  try {
    log("pipeline-translate", {
      status: "start",
      progress,
      kinguinId: hit.kinguinId,
    });
    const translateT0 = Date.now();
    translated = await translateProductFields({
      name: remote.name,
      description: remote.description ?? "",
      activationDetails: remote.activationDetails ?? "",
      regionalLimitations: remote.regionalLimitations ?? "",
      genres: (remote.genres ?? []).join(", "),
      languages: (remote.languages ?? []).join(", "),
    });
    log("pipeline-translate", {
      status: "done",
      progress,
      kinguinId: hit.kinguinId,
      fields: Object.keys(translated),
      nameEs: translated.name?.slice(0, 60) ?? null,
      durationMs: Date.now() - translateT0,
    });
  } catch (error) {
    log(
      "pipeline-translate",
      {
        status: "error-continue-en",
        progress,
        kinguinId: hit.kinguinId,
        message:
          error instanceof Error
            ? error.message.slice(0, 200)
            : "translate error",
      },
      "warn",
    );
  }

  const displayName = (translated.name?.trim() || remote.name).slice(0, 80);

  // 3) Category
  let categoryId: string;
  try {
    const category = await assignCategoryForProduct(
      {
        kinguinId: hit.kinguinId,
        name: displayName,
        platform: remote.platform ?? null,
        genres: splitCsv(translated.genres) ?? remote.genres ?? [],
        tags: remote.tags ?? [],
      },
      registry,
    );
    categoryId = category.categoryId;
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message.slice(0, 200)
        : "Error al asignar categoría";
    log(
      "pipeline-category",
      { status: "error", progress, kinguinId: hit.kinguinId, message },
      "error",
    );
    return {
      ok: false,
      kinguinId: hit.kinguinId,
      message,
      step: "category",
      durationMs: Date.now() - t0,
    };
  }

  // 4) Import + ACTIVE
  const markupPct = randomMarkupPct(MARKUP_MIN_PCT, MARKUP_MAX_PCT);
  try {
    log("pipeline-import", {
      status: "start",
      progress,
      kinguinId: hit.kinguinId,
      name: displayName,
      markupPct,
      categoryId,
    });
    const importT0 = Date.now();
    const result = await importKinguinProduct({
      kinguinId: hit.kinguinId,
      markupPct,
      categoryIds: [categoryId],
      name: translated.name?.trim() || remote.name,
      description:
        translated.description?.trim() || remote.description || undefined,
      activationDetails:
        translated.activationDetails?.trim() ||
        remote.activationDetails ||
        undefined,
      regionalLimitations:
        translated.regionalLimitations?.trim() ||
        remote.regionalLimitations ||
        undefined,
      genres: splitCsv(translated.genres) ?? remote.genres ?? undefined,
      languages:
        splitCsv(translated.languages) ?? remote.languages ?? undefined,
    });

    log("pipeline-activate", {
      status: "start",
      progress,
      kinguinId: hit.kinguinId,
      productId: result.productId,
    });
    await prisma.product.update({
      where: { id: result.productId },
      data: { status: ProductStatus.ACTIVE },
    });

    const durationMs = Date.now() - t0;
    log("pipeline-import", {
      status: "ACTIVE",
      progress,
      kinguinId: hit.kinguinId,
      productId: result.productId,
      markupPct,
      categoryId,
      name: displayName,
      importDurationMs: Date.now() - importT0,
      durationMs,
    });
    log("pipeline", {
      status: "done",
      progress,
      kinguinId: hit.kinguinId,
      productId: result.productId,
      durationMs,
    });

    return {
      ok: true,
      kinguinId: hit.kinguinId,
      productId: result.productId,
      markupPct,
      categoryId,
      name: displayName,
      durationMs,
    };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message.slice(0, 200)
        : "Error al importar";
    log(
      "pipeline-import",
      {
        status: "error",
        progress,
        kinguinId: hit.kinguinId,
        name: displayName,
        message,
        durationMs: Date.now() - t0,
      },
      "error",
    );
    return {
      ok: false,
      kinguinId: hit.kinguinId,
      message,
      step: "import",
      durationMs: Date.now() - t0,
    };
  }
}

async function main() {
  const options = parseCli();
  log("start", {
    argv: process.argv.slice(2),
    seeds: options.seeds,
    limit: options.limit,
    termsPerSeed: options.termsPerSeed,
    pageSize: options.pageSize,
    concurrency: options.concurrency,
    markupPctRange: [MARKUP_MIN_PCT, MARKUP_MAX_PCT],
    mode: "pipeline",
  });

  if (options.seeds.length === 0) {
    log(
      "usage",
      {
        message:
          'Uso: bun --env-file .env.production --conditions=react-server scripts/product-discovery.ts "<seed>" [más seeds…] [--limit=100]',
      },
      "error",
    );
    process.exitCode = 1;
    return;
  }

  assertCriticalEnv();
  await confirmProductionWrite(options);

  const allTerms: string[] = [];
  const termsSeen = new Set<string>();
  for (const seed of options.seeds) {
    const generated = await generateSearchTerms(seed, options.termsPerSeed);
    for (const term of generated) {
      const key = term.toLowerCase();
      if (termsSeen.has(key)) continue;
      termsSeen.add(key);
      allTerms.push(term);
    }
  }

  log("ai-terms-all", {
    status: "done",
    seeds: options.seeds.length,
    uniqueTerms: allTerms.length,
    terms: allTerms,
  });

  const { hits, byTerm } = await collectHits(
    allTerms,
    options.pageSize,
    options.limit,
  );

  log("search-summary", {
    uniqueHits: hits.length,
    byTerm,
    sample: hits.slice(0, 20).map((hit) => ({
      kinguinId: hit.kinguinId,
      name: hit.name.slice(0, 80),
      platform: hit.platform,
      priceEur: hit.priceEur,
      qty: hit.qty,
    })),
  });

  if (hits.length === 0) {
    log("done", { imported: 0, message: "sin hits" });
    return;
  }

  log("fx", { status: "warming eurToClp" });
  const eurClpRate = await eurToClp(1);
  log("fx", { status: "ok", eurClpRate });

  const catalogCategories = await loadCatalogCategories();
  log("categories-load", {
    count: catalogCategories.length,
    sample: catalogCategories.slice(0, 20).map((c) => ({
      id: c.id,
      name: c.parentName ? `${c.parentName} · ${c.name}` : c.name,
    })),
  });
  const registry = new CategoryRegistry(catalogCategories);

  const pipelineLimit = pLimit(options.concurrency);
  log("pipeline-batch", {
    status: "start",
    hits: hits.length,
    concurrency: options.concurrency,
  });
  const pipelineT0 = Date.now();
  let completed = 0;
  let okCount = 0;
  let failCount = 0;

  const results = await Promise.all(
    hits.map((hit, index) =>
      pipelineLimit(async () => {
        const result = await processHitPipeline({
          hit,
          index: index + 1,
          total: hits.length,
          registry,
        });
        completed += 1;
        if (result.ok) okCount += 1;
        else failCount += 1;
        log("pipeline-batch-progress", {
          completed,
          total: hits.length,
          ok: okCount,
          failed: failCount,
          lastStatus: result.ok ? "ACTIVE" : "error",
          lastKinguinId: result.kinguinId,
        });
        return result;
      }),
    ),
  );

  const created = results.filter((row) => row.ok);
  const failed = results.filter((row) => !row.ok);

  log("pipeline-batch", {
    status: "done",
    imported: created.length,
    failed: failed.length,
    durationMs: Date.now() - pipelineT0,
  });

  log("cache", { status: "invalidate-kinguin-search" });
  await invalidateKinguinSearchCache();
  log("cache", { status: "ok" });

  log("done", {
    termsGenerated: allTerms.length,
    terms: allTerms,
    found: hits.length,
    categoriesCreated: registry.created.map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
    })),
    imported: created.length,
    activated: created.length,
    failed: failed.length,
    markupPctRange: [MARKUP_MIN_PCT, MARKUP_MAX_PCT],
    concurrency: options.concurrency,
    created: created.map((row) =>
      row.ok
        ? {
            kinguinId: row.kinguinId,
            productId: row.productId,
            markupPct: row.markupPct,
            categoryId: row.categoryId,
            name: row.name,
            durationMs: row.durationMs,
          }
        : null,
    ),
    failures: failed.map((row) =>
      row.ok
        ? null
        : {
            kinguinId: row.kinguinId,
            step: row.step,
            message: row.message,
            durationMs: row.durationMs,
          },
    ),
    totalDurationMs: Date.now() - startedAt,
  });
}

main()
  .catch((error) => {
    log(
      "fatal",
      {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      },
      "error",
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    log("shutdown", { disconnectingPrisma: true });
    await prisma.$disconnect();
    log("shutdown", {
      status: "done",
      totalDurationMs: Date.now() - startedAt,
    });
  });
