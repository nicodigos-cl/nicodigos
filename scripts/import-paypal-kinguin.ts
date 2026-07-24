/**
 * Import all Chile-compatible, not-yet-imported Kinguin products matching "paypal"
 * into the fixed catalog category `paypal`, with OpenAI field translation.
 *
 *   bun --env-file .env.production --conditions=react-server \
 *     scripts/import-paypal-kinguin.ts --yes --concurrency=8
 *
 * Flags:
 *   --yes                  skip PUBLICAR confirmation
 *   --q=paypal             search phrase (default paypal)
 *   --category-slug=paypal category slug (default paypal)
 *   --concurrency=N        pipeline workers (default 8)
 *   --limit=N              max products (default: all matching)
 *   --page-size=10|20|50   ESA page size while collecting (default 50)
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
import prisma from "@/lib/prisma";
import {
  translateProductFields,
  type ProductTranslateFields,
} from "@/lib/products/translate-fields";
import type { KinguinSearchHitDto } from "@/types/kinguin-admin";
import pLimit from "p-limit";

const CONFIRM_TOKEN = "PUBLICAR";
const MARKUP_MIN_PCT = 35;
const MARKUP_MAX_PCT = 45;
const DEFAULT_CONCURRENCY = 8;

const startedAt = Date.now();

type CliOptions = {
  yes: boolean;
  q: string;
  categorySlug: string;
  concurrency: number;
  limit: number | null;
  pageSize: 10 | 20 | 50;
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
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

function parseIntFlag(name: string, fallback: number): number {
  const arg = process.argv.find((item) => item.startsWith(`${name}=`));
  if (!arg) return fallback;
  const value = Number.parseInt(arg.split("=")[1] ?? "", 10);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function parseStringFlag(name: string, fallback: string): string {
  const arg = process.argv.find((item) => item.startsWith(`${name}=`));
  if (!arg) return fallback;
  return (arg.split("=")[1] ?? fallback).trim() || fallback;
}

function parsePageSize(): 10 | 20 | 50 {
  const raw = parseIntFlag("--page-size", 50);
  if (raw === 10 || raw === 20 || raw === 50) return raw;
  return 50;
}

function parseCli(): CliOptions {
  const limitArg = process.argv.find((item) => item.startsWith("--limit="));
  return {
    yes: process.argv.includes("--yes"),
    q: parseStringFlag("--q", "paypal"),
    categorySlug: parseStringFlag("--category-slug", "paypal"),
    concurrency: parseIntFlag("--concurrency", DEFAULT_CONCURRENCY),
    limit: limitArg
      ? parseIntFlag("--limit", Number.MAX_SAFE_INTEGER)
      : null,
    pageSize: parsePageSize(),
  };
}

function randomMarkupPct(min: number, max: number): number {
  const low = Math.min(min, max);
  const high = Math.max(min, max);
  return low + Math.floor(Math.random() * (high - low + 1));
}

function splitCsv(value: string | undefined): string[] | undefined {
  if (!value?.trim()) return undefined;
  return value
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean);
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
  if (!value) throw new Error(`Falta variable de entorno: ${name}`);
  return value;
}

function assertCriticalEnv(): void {
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
    database: databaseHostLabel(process.env.DATABASE_URL!),
    kinguinEnv: process.env.KINGUIN_ENVIRONMENT?.trim() || "(default)",
    openaiModel: process.env.OPENAI_MODEL?.trim() || "gpt-5-nano",
  });
}

async function confirmProductionWrite(options: CliOptions): Promise<void> {
  if (options.yes) {
    log("confirm", { status: "skipped-via --yes" }, "warn");
    return;
  }

  log(
    "confirm",
    {
      status: "waiting",
      warning: "escritura en DB del env cargado; productos ACTIVE",
      database: databaseHostLabel(process.env.DATABASE_URL!),
      q: options.q,
      categorySlug: options.categorySlug,
      concurrency: options.concurrency,
      limit: options.limit,
      confirmToken: CONFIRM_TOKEN,
    },
    "warn",
  );
  console.error(`Escribe exactamente ${CONFIRM_TOKEN} para continuar:`);
  const rl = readline.createInterface({ input, output });
  try {
    const answer = (await rl.question("> ")).trim();
    if (answer !== CONFIRM_TOKEN) {
      throw new Error(
        `Confirmación cancelada (se esperaba "${CONFIRM_TOKEN}").`,
      );
    }
    log("confirm", { status: "accepted" });
  } finally {
    rl.close();
  }
}

async function collectAllHits(
  q: string,
  pageSize: 10 | 20 | 50,
  limit: number | null,
): Promise<KinguinSearchHitDto[]> {
  const byId = new Map<number, KinguinSearchHitDto>();
  let page = 1;
  let totalPages = 1;

  log("search", { status: "start", q, pageSize, chile: "compatible", imported: "not_imported" });

  while (page <= totalPages) {
    if (limit != null && byId.size >= limit) break;

    const t0 = Date.now();
    const result = await searchKinguinProducts({
      q,
      page,
      pageSize,
      chile: "compatible",
      imported: "not_imported",
    });
    totalPages = result.totalPages;

    let added = 0;
    for (const item of result.items) {
      if (byId.has(item.kinguinId)) continue;
      byId.set(item.kinguinId, item);
      added += 1;
      if (limit != null && byId.size >= limit) break;
    }

    log("search-page", {
      status: "done",
      page,
      totalPages,
      apiTotal: result.total,
      pageItems: result.items.length,
      added,
      uniqueHits: byId.size,
      durationMs: Date.now() - t0,
    });

    if (result.items.length === 0) break;
    page += 1;
  }

  const hits = [...byId.values()];
  log("search", { status: "done", uniqueHits: hits.length });
  return hits;
}

async function processHit(options: {
  hit: KinguinSearchHitDto;
  index: number;
  total: number;
  categoryId: string;
}): Promise<
  | {
      ok: true;
      kinguinId: number;
      productId: string;
      markupPct: number;
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
  const { hit, index, total, categoryId } = options;
  const t0 = Date.now();
  const progress = `${index}/${total}`;
  const client = getKinguinClient();

  log("pipeline", {
    status: "start",
    progress,
    kinguinId: hit.kinguinId,
    hitName: hit.name.slice(0, 80),
  });

  let remote;
  try {
    remote = await client.getProductByKinguinId(hit.kinguinId);
  } catch (error) {
    const message =
      error instanceof Error ? error.message.slice(0, 200) : "fetch error";
    log("pipeline-fetch", { status: "error", progress, message }, "error");
    return {
      ok: false,
      kinguinId: hit.kinguinId,
      message,
      step: "fetch",
      durationMs: Date.now() - t0,
    };
  }

  let translated: ProductTranslateFields = {};
  try {
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
      nameEs: translated.name?.slice(0, 60) ?? null,
      durationMs: Date.now() - translateT0,
    });
  } catch (error) {
    log(
      "pipeline-translate",
      {
        status: "error-continue-en",
        progress,
        message:
          error instanceof Error
            ? error.message.slice(0, 200)
            : "translate error",
      },
      "warn",
    );
  }

  const displayName = (translated.name?.trim() || remote.name).slice(0, 120);
  const markupPct = randomMarkupPct(MARKUP_MIN_PCT, MARKUP_MAX_PCT);

  try {
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

    await prisma.product.update({
      where: { id: result.productId },
      data: { status: ProductStatus.ACTIVE },
    });

    const durationMs = Date.now() - t0;
    log("pipeline", {
      status: "ACTIVE",
      progress,
      kinguinId: hit.kinguinId,
      productId: result.productId,
      markupPct,
      name: displayName.slice(0, 80),
      durationMs,
    });

    return {
      ok: true,
      kinguinId: hit.kinguinId,
      productId: result.productId,
      markupPct,
      name: displayName,
      durationMs,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message.slice(0, 200) : "import error";
    log(
      "pipeline-import",
      { status: "error", progress, kinguinId: hit.kinguinId, message },
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
  log("start", { argv: process.argv.slice(2), ...options });

  assertCriticalEnv();
  await confirmProductionWrite(options);

  const category = await prisma.category.findFirst({
    where: { slug: options.categorySlug },
    select: { id: true, name: true, slug: true },
  });
  if (!category) {
    throw new Error(`Categoría no encontrada: slug=${options.categorySlug}`);
  }
  log("category", category);

  const hits = await collectAllHits(options.q, options.pageSize, options.limit);
  log("search-summary", {
    uniqueHits: hits.length,
    sample: hits.slice(0, 15).map((hit) => ({
      kinguinId: hit.kinguinId,
      name: hit.name.slice(0, 70),
      priceEur: hit.priceEur,
      qty: hit.qty,
    })),
  });

  if (hits.length === 0) {
    log("done", { imported: 0, message: "sin hits" });
    return;
  }

  const eurClpRate = await eurToClp(1);
  log("fx", { status: "ok", eurClpRate });

  const pipelineLimit = pLimit(options.concurrency);
  let completed = 0;
  let okCount = 0;
  let failCount = 0;
  const pipelineT0 = Date.now();

  log("pipeline-batch", {
    status: "start",
    hits: hits.length,
    concurrency: options.concurrency,
    categoryId: category.id,
  });

  const results = await Promise.all(
    hits.map((hit, index) =>
      pipelineLimit(async () => {
        const result = await processHit({
          hit,
          index: index + 1,
          total: hits.length,
          categoryId: category.id,
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

  await invalidateKinguinSearchCache();

  log("done", {
    found: hits.length,
    imported: created.length,
    failed: failed.length,
    concurrency: options.concurrency,
    category: category.slug,
    durationMs: Date.now() - pipelineT0,
    failedSample: failed.slice(0, 20).map((row) => ({
      kinguinId: row.kinguinId,
      step: row.step,
      message: row.message,
    })),
  });
}

main()
  .catch((error) => {
    log(
      "fatal",
      {
        message:
          error instanceof Error ? error.message.slice(0, 500) : String(error),
      },
      "error",
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect().catch(() => {});
  });
