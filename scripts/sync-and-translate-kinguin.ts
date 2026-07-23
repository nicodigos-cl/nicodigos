/**
 * Sync all local Kinguin products against ESA, then translate English catalog fields.
 *
 * Usage (prod via Railway):
 *   railway run --service web --environment production -- \
 *     bun --conditions=react-server scripts/sync-and-translate-kinguin.ts
 *
 * Flags:
 *   --dry-run              report only
 *   --skip-sync            only translate
 *   --skip-translate       only sync
 *   --force-catalog-text   overwrite regional/activation/genres/languages from Kinguin
 *   --limit=N              process at most N products (after sync, for translate)
 */
import "dotenv/config";

import { DeliveryMethod } from "@/generated/prisma/client";
import { syncAllKinguinProducts } from "@/lib/kinguin/sync";
import prisma from "@/lib/prisma";
import {
  needsProductTranslation,
  PRODUCT_TRANSLATE_FIELDS,
  translateProductFieldsBulk,
  type ProductTranslateFields,
} from "@/lib/products/translate-fields";

const DRY_RUN = process.argv.includes("--dry-run");
const SKIP_SYNC = process.argv.includes("--skip-sync");
const SKIP_TRANSLATE = process.argv.includes("--skip-translate");
const FORCE_CATALOG_TEXT = process.argv.includes("--force-catalog-text");
const limitArg = process.argv.find((arg) => arg.startsWith("--limit="));
const LIMIT = limitArg
  ? Math.max(1, Number.parseInt(limitArg.split("=")[1] ?? "0", 10) || 0)
  : 0;

function csvOrJoin(values: string[]): string {
  return values.filter(Boolean).join(", ");
}

function splitCsv(value: string | undefined): string[] {
  if (!value?.trim()) return [];
  return value
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function pickEnglishFields(product: {
  name: string;
  description: string | null;
  platform: string | null;
  regionalLimitations: string | null;
  activationDetails: string | null;
  genres: string[];
  languages: string[];
}): ProductTranslateFields {
  const candidates: ProductTranslateFields = {
    name: product.name,
    description: product.description ?? "",
    platform: product.platform ?? "",
    regionalLimitations: product.regionalLimitations ?? "",
    activationDetails: product.activationDetails ?? "",
    genres: csvOrJoin(product.genres),
    languages: csvOrJoin(product.languages),
  };

  const english: ProductTranslateFields = {};
  for (const key of PRODUCT_TRANSLATE_FIELDS) {
    if (key === "platform") continue;
    const value = candidates[key];
    if (needsProductTranslation(value)) {
      english[key] = value;
    }
  }
  return english;
}

async function translateKinguinProducts() {
  const products = await prisma.product.findMany({
    where: {
      deliveryMethod: DeliveryMethod.KINGUIN,
      kinguinId: { not: null },
    },
    select: {
      id: true,
      name: true,
      description: true,
      platform: true,
      regionalLimitations: true,
      activationDetails: true,
      genres: true,
      languages: true,
      status: true,
    },
    orderBy: { updatedAt: "asc" },
  });

  const work = products
    .map((product) => ({ product, fields: pickEnglishFields(product) }))
    .filter((row) => Object.keys(row.fields).length > 0);

  const selected = LIMIT > 0 ? work.slice(0, LIMIT) : work;

  console.log(
    JSON.stringify(
      {
        phase: "translate",
        scanned: products.length,
        withEnglish: work.length,
        selected: selected.length,
        dryRun: DRY_RUN,
      },
      null,
      2,
    ),
  );

  for (const row of selected.slice(0, 12)) {
    console.log(
      `- ${row.product.status} ${row.product.name.slice(0, 60)} → [${Object.keys(row.fields).join(", ")}]`,
    );
  }
  if (selected.length > 12) {
    console.log(`… y ${selected.length - 12} más`);
  }

  if (DRY_RUN || selected.length === 0) {
    return { updated: 0, skipped: selected.length, failed: 0 };
  }

  const BATCH = 40;
  let updated = 0;
  let skipped = 0;
  let failed = 0;

  for (let offset = 0; offset < selected.length; offset += BATCH) {
    const chunk = selected.slice(offset, offset + BATCH);
    console.log(
      `translate batch ${offset + 1}-${offset + chunk.length} / ${selected.length}`,
    );

    let translatedById: Map<string, ProductTranslateFields>;
    try {
      translatedById = await translateProductFieldsBulk(
        chunk.map((row) => ({
          productId: row.product.id,
          fields: row.fields,
        })),
      );
    } catch (error) {
      console.error(
        `batch failed at offset ${offset}`,
        error instanceof Error ? error.message : error,
      );
      failed += chunk.length;
      continue;
    }

    for (const row of chunk) {
      const translated = translatedById.get(row.product.id);
      if (!translated || Object.keys(translated).length === 0) {
        skipped += 1;
        continue;
      }

      try {
        await prisma.product.update({
          where: { id: row.product.id },
          data: {
            ...(translated.name != null ? { name: translated.name } : {}),
            ...(translated.description != null
              ? { description: translated.description }
              : {}),
            ...(translated.platform != null
              ? { platform: translated.platform }
              : {}),
            ...(translated.regionalLimitations != null
              ? { regionalLimitations: translated.regionalLimitations }
              : {}),
            ...(translated.activationDetails != null
              ? { activationDetails: translated.activationDetails }
              : {}),
            ...(translated.genres != null
              ? { genres: splitCsv(translated.genres) }
              : {}),
            ...(translated.languages != null
              ? { languages: splitCsv(translated.languages) }
              : {}),
          },
        });
        updated += 1;
      } catch (error) {
        failed += 1;
        console.error(
          `fail ${row.product.id}`,
          error instanceof Error ? error.message : error,
        );
      }
    }

    console.log(
      JSON.stringify({ offset, updated, skipped, failed }, null, 2),
    );
  }

  return { updated, skipped, failed };
}

async function main() {
  console.log(
    JSON.stringify(
      {
        dryRun: DRY_RUN,
        skipSync: SKIP_SYNC,
        skipTranslate: SKIP_TRANSLATE,
        forceCatalogText: FORCE_CATALOG_TEXT,
        limit: LIMIT || null,
      },
      null,
      2,
    ),
  );

  if (!SKIP_SYNC) {
    if (DRY_RUN) {
      const count = await prisma.product.count({
        where: {
          deliveryMethod: DeliveryMethod.KINGUIN,
          kinguinId: { not: null },
        },
      });
      console.log(JSON.stringify({ phase: "sync", dryRun: true, count }, null, 2));
    } else {
      console.log("starting kinguin sync…");
      const syncResult = await syncAllKinguinProducts({
        forceCatalogText: FORCE_CATALOG_TEXT,
      });
      console.log(
        JSON.stringify(
          {
            phase: "sync",
            products: syncResult.products,
            totals: syncResult.totals,
            sampleErrors: syncResult.results
              .filter((item) => item.status === "error")
              .slice(0, 10)
              .map((item) => ({
                productId: item.productId,
                kinguinId: item.kinguinId,
                error: item.error,
              })),
          },
          null,
          2,
        ),
      );
    }
  }

  if (!SKIP_TRANSLATE) {
    const translateResult = await translateKinguinProducts();
    console.log(JSON.stringify({ phase: "translate-done", ...translateResult }, null, 2));
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
