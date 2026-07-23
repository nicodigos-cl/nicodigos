/**
 * Detect English product fields with ELD and translate them to LatAm Spanish.
 *
 * Usage:
 *   bun --conditions=react-server scripts/translate-english-products.ts --dry-run
 *   bun --conditions=react-server scripts/translate-english-products.ts
 *   bun --conditions=react-server scripts/translate-english-products.ts --limit=50
 */
import "dotenv/config";

import prisma from "@/lib/prisma";
import {
  needsProductTranslation,
  PRODUCT_TRANSLATE_FIELDS,
  translateProductFieldsBulk,
  type ProductTranslateFields,
} from "@/lib/products/translate-fields";

const DRY_RUN = process.argv.includes("--dry-run");
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
    // Platform values are almost always brand labels (Steam, Epic Games).
    if (key === "platform") continue;
    const value = candidates[key];
    if (needsProductTranslation(value)) {
      english[key] = value;
    }
  }
  return english;
}

async function main() {
  const products = await prisma.product.findMany({
    select: {
      id: true,
      name: true,
      description: true,
      platform: true,
      regionalLimitations: true,
      activationDetails: true,
      genres: true,
      languages: true,
      deliveryMethod: true,
      status: true,
    },
    orderBy: { updatedAt: "desc" },
  });

  const work = products
    .map((product) => {
      const fields = pickEnglishFields(product);
      return { product, fields };
    })
    .filter((row) => Object.keys(row.fields).length > 0);

  const selected = LIMIT > 0 ? work.slice(0, LIMIT) : work;

  console.log(
    JSON.stringify(
      {
        scanned: products.length,
        withEnglish: work.length,
        selected: selected.length,
        dryRun: DRY_RUN,
      },
      null,
      2,
    ),
  );

  for (const row of selected.slice(0, 15)) {
    console.log(
      `- ${row.product.deliveryMethod}/${row.product.status} ${row.product.name.slice(0, 60)} → [${Object.keys(row.fields).join(", ")}]`,
    );
  }
  if (selected.length > 15) {
    console.log(`… y ${selected.length - 15} más`);
  }

  if (DRY_RUN || selected.length === 0) {
    return;
  }

  const translatedById = await translateProductFieldsBulk(
    selected.map((row) => ({
      productId: row.product.id,
      fields: row.fields,
    })),
  );

  let updated = 0;
  let skipped = 0;
  let failed = 0;

  for (const row of selected) {
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
      console.log(`ok ${row.product.id} ${row.product.name.slice(0, 40)}`);
    } catch (error) {
      failed += 1;
      console.error(
        `fail ${row.product.id}`,
        error instanceof Error ? error.message : error,
      );
    }
  }

  console.log(JSON.stringify({ updated, skipped, failed }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
