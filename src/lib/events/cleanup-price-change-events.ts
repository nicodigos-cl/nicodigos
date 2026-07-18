import { createLogger } from "@/lib/logger";
import prisma from "@/lib/prisma";

const log = createLogger({ module: "price-change-events-cleanup" });

/** Default retention: 7 days (enough for in-app notices; override via env). */
export const DEFAULT_PRICE_CHANGE_RETENTION_DAYS = 7;

export function getPriceChangeRetentionDays(): number {
  const raw = process.env.PRICE_CHANGE_EVENT_RETENTION_DAYS?.trim();
  const parsed = raw ? Number.parseInt(raw, 10) : NaN;
  if (Number.isFinite(parsed) && parsed >= 1 && parsed <= 365) {
    return parsed;
  }
  return DEFAULT_PRICE_CHANGE_RETENTION_DAYS;
}

export type CleanupPriceChangeEventsResult = {
  retentionDays: number;
  deleted: number;
  cutoff: string;
};

/** Delete price-change events older than the configured retention window. */
export async function cleanupExpiredPriceChangeEvents(): Promise<CleanupPriceChangeEventsResult> {
  const retentionDays = getPriceChangeRetentionDays();
  const cutoff = new Date(
    Date.now() - retentionDays * 24 * 60 * 60 * 1000,
  );

  const result = await prisma.productPriceChangeEvent.deleteMany({
    where: { createdAt: { lt: cutoff } },
  });

  log.info(
    { deleted: result.count, retentionDays, cutoff: cutoff.toISOString() },
    "cleaned expired product price change events",
  );

  return {
    retentionDays,
    deleted: result.count,
    cutoff: cutoff.toISOString(),
  };
}
