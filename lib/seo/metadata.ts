import type { Metadata } from "next";
import type { Prisma } from "@/lib/generated/prisma/client";

/** Same shape as Next.js `Metadata` (metadata-interface.d.ts). */
export type SeoMetadataDocument = Metadata;

export function parseSeoMetadataDocument(
  value: unknown,
): SeoMetadataDocument | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as SeoMetadataDocument;
}

export function serializeSeoMetadataDocument(
  document: SeoMetadataDocument,
): Prisma.InputJsonValue {
  return document as Prisma.InputJsonValue;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Merges DB overrides into defaults for `generateMetadata`. */
export function mergeSeoMetadata(
  base: SeoMetadataDocument,
  override: SeoMetadataDocument | null | undefined,
): SeoMetadataDocument {
  if (!override) {
    return base;
  }

  const merged: SeoMetadataDocument = {
    ...base,
    ...override,
  };

  if (override.openGraph) {
    merged.openGraph = {
      ...(isRecord(base.openGraph) ? base.openGraph : {}),
      ...override.openGraph,
    };
  }

  if (override.twitter) {
    merged.twitter = {
      ...(isRecord(base.twitter) ? base.twitter : {}),
      ...override.twitter,
    };
  }

  if (override.alternates) {
    merged.alternates = {
      ...(isRecord(base.alternates) ? base.alternates : {}),
      ...override.alternates,
    };
  }

  if (override.robots) {
    if (typeof override.robots === "string") {
      merged.robots = override.robots;
    } else {
      merged.robots = {
        ...(isRecord(base.robots) ? base.robots : {}),
        ...override.robots,
      };
    }
  }

  return merged;
}

export function seoMetadataFromRelation(
  relation: { document: unknown } | null | undefined,
): SeoMetadataDocument | null {
  if (!relation) {
    return null;
  }

  return parseSeoMetadataDocument(relation.document);
}
