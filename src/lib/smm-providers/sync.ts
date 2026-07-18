import {
  DeliveryMethod,
  ProductStatus,
  Prisma,
  SmmProviderStatus,
} from "@/generated/prisma/client";

import { createLogger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { SmmService as SmmApiClient } from "@/lib/smm-service";

const log = createLogger({ module: "smm-providers-sync" });

/** Matches `SmmService.rate` @db.Decimal(18, 6). */
const SMM_RATE_SCALE = 6;
const SMM_RATE_MAX = new Prisma.Decimal("999999999999.999999");
const SMM_INT_MAX = 2_147_483_647;

export function parseSmmRate(raw: string): Prisma.Decimal {
  try {
    const decimal = new Prisma.Decimal(String(raw).trim() || "0");
    if (!decimal.isFinite() || decimal.isNegative()) {
      return new Prisma.Decimal(0);
    }
    const rounded = decimal.toDecimalPlaces(SMM_RATE_SCALE);
    return Prisma.Decimal.min(rounded, SMM_RATE_MAX);
  } catch {
    return new Prisma.Decimal(0);
  }
}

export function parseSmmInt(raw: string): number {
  const value = Number.parseInt(String(raw), 10);
  if (!Number.isFinite(value) || value < 0) {
    return 0;
  }
  return Math.min(value, SMM_INT_MAX);
}

function normalizeApiUrl(url: string): string {
  return url.trim().replace(/\/+$/, "");
}

export type SyncProviderResult = {
  providerId: string;
  providerName: string;
  synced: number;
  removed: number;
  archivedProducts: number;
  error?: string;
};

/**
 * Sync one provider: upsert remote services, delete missing ones,
 * and archive SMM products linked to removed remote service ids.
 */
export async function syncProviderServices(
  providerId: string,
): Promise<SyncProviderResult> {
  const provider = await prisma.smmProvider.findUnique({
    where: { id: providerId },
    select: {
      id: true,
      name: true,
      apiUrl: true,
      apiKey: true,
    },
  });

  if (!provider) {
    return {
      providerId,
      providerName: "",
      synced: 0,
      removed: 0,
      archivedProducts: 0,
      error: "Provider no encontrado.",
    };
  }

  const apiUrl = normalizeApiUrl(provider.apiUrl);

  try {
    const client = new SmmApiClient({
      apiUrl: provider.apiUrl,
      apiKey: provider.apiKey,
    });
    const remoteServices = await client.services();
    const remoteIds = remoteServices.map((item) => item.service);
    const remoteIdSet = new Set(remoteIds);

    const result = await prisma.$transaction(async (tx) => {
      for (const item of remoteServices) {
        const rate = parseSmmRate(item.rate);
        const min = parseSmmInt(item.min);
        const max = parseSmmInt(item.max);

        await tx.smmService.upsert({
          where: {
            providerId_remoteServiceId: {
              providerId: provider.id,
              remoteServiceId: item.service,
            },
          },
          create: {
            providerId: provider.id,
            remoteServiceId: item.service,
            name: item.name,
            type: item.type,
            category: item.category,
            rate,
            min,
            max,
            refill: Boolean(item.refill),
            cancel: Boolean(item.cancel),
            isActive: true,
          },
          update: {
            name: item.name,
            type: item.type,
            category: item.category,
            rate,
            min,
            max,
            refill: Boolean(item.refill),
            cancel: Boolean(item.cancel),
            isActive: true,
          },
        });
      }

      const existing = await tx.smmService.findMany({
        where: { providerId: provider.id },
        select: { id: true, remoteServiceId: true },
      });

      const toRemove = existing.filter(
        (service) => !remoteIdSet.has(service.remoteServiceId),
      );
      const removedRemoteIds = toRemove.map((service) => service.remoteServiceId);

      let archivedProducts = 0;

      if (removedRemoteIds.length > 0) {
        const archived = await tx.product.updateMany({
          where: {
            deliveryMethod: DeliveryMethod.SMM,
            smmServiceId: { in: removedRemoteIds },
            status: { not: ProductStatus.ARCHIVED },
            OR: [
              { smmApiUrl: apiUrl },
              { smmApiUrl: `${apiUrl}/` },
              { smmApiUrl: provider.apiUrl },
            ],
          },
          data: {
            status: ProductStatus.ARCHIVED,
          },
        });
        archivedProducts = archived.count;

        await tx.smmService.deleteMany({
          where: {
            providerId: provider.id,
            remoteServiceId: { in: removedRemoteIds },
          },
        });
      }

      await tx.smmProvider.update({
        where: { id: provider.id },
        data: {
          lastSyncedAt: new Date(),
          lastError: null,
          status: SmmProviderStatus.ACTIVE,
        },
      });

      return {
        synced: remoteServices.length,
        removed: toRemove.length,
        archivedProducts,
      };
    });

    return {
      providerId: provider.id,
      providerName: provider.name,
      ...result,
    };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message.slice(0, 500)
        : "Error al sincronizar servicios.";

    await prisma.smmProvider.update({
      where: { id: provider.id },
      data: {
        lastError: message,
        status: SmmProviderStatus.ERROR,
      },
    });

    log.error({ err: error, providerId: provider.id }, "provider sync failed");

    return {
      providerId: provider.id,
      providerName: provider.name,
      synced: 0,
      removed: 0,
      archivedProducts: 0,
      error: message,
    };
  }
}

export type SyncAllProvidersResult = {
  providers: number;
  results: SyncProviderResult[];
  totals: {
    synced: number;
    removed: number;
    archivedProducts: number;
    errors: number;
  };
};

/** Sync every SMM provider (ACTIVE, ERROR, and INACTIVE). */
export async function syncAllProvidersServices(): Promise<SyncAllProvidersResult> {
  const providers = await prisma.smmProvider.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  const results: SyncProviderResult[] = [];

  for (const provider of providers) {
    log.info({ providerId: provider.id, name: provider.name }, "syncing provider");
    const result = await syncProviderServices(provider.id);
    results.push(result);
  }

  const totals = results.reduce(
    (acc, item) => {
      acc.synced += item.synced;
      acc.removed += item.removed;
      acc.archivedProducts += item.archivedProducts;
      if (item.error) acc.errors += 1;
      return acc;
    },
    { synced: 0, removed: 0, archivedProducts: 0, errors: 0 },
  );

  return {
    providers: providers.length,
    results,
    totals,
  };
}
