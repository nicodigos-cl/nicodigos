import {
  DeliveryMethod,
  ProductStatus,
  Prisma,
} from "@/generated/prisma/client";

import {
  emitDomainEvent,
  onDomainEvent,
  type SmmServiceRateChangedEvent,
} from "@/lib/events/bus";
import { computePriceChangeMetrics } from "@/lib/events/price-change";
import { applyMarkupPct } from "@/lib/fx/markup";
import { usdToClp } from "@/lib/fx/usd-clp";
import { createLogger } from "@/lib/logger";
import prisma from "@/lib/prisma";

const log = createLogger({ module: "events-smm-product-price" });

const EVENT_SOURCE = "smm.service.rate_changed";

function apiUrlVariants(apiUrl: string): string[] {
  const normalized = apiUrl.trim().replace(/\/+$/, "");
  return Array.from(
    new Set([normalized, `${normalized}/`, apiUrl.trim()].filter(Boolean)),
  );
}

async function handleSmmServiceRateChanged(
  event: SmmServiceRateChangedEvent,
): Promise<void> {
  const rateUsd = Number.parseFloat(event.newRate);
  if (!Number.isFinite(rateUsd) || rateUsd < 0) {
    log.warn({ event }, "invalid new rate, skipping reprice");
    return;
  }

  const baseClp = await usdToClp(rateUsd);
  const urlVariants = apiUrlVariants(event.providerApiUrl);

  const products = await prisma.product.findMany({
    where: {
      deliveryMethod: DeliveryMethod.SMM,
      smmServiceId: event.remoteServiceId,
      smmMarkupPct: { not: null },
      status: { not: ProductStatus.ARCHIVED },
      smmApiUrl: { in: urlVariants },
    },
    select: {
      id: true,
      smmMarkupPct: true,
      price: true,
      currency: true,
    },
  });

  if (products.length === 0) {
    return;
  }

  let updated = 0;
  const priceEvents: Prisma.ProductPriceChangeEventCreateManyInput[] = [];

  for (const product of products) {
    const markupPct = Number.parseFloat(product.smmMarkupPct?.toString() ?? "");
    if (!Number.isFinite(markupPct)) {
      continue;
    }

    const nextPrice = applyMarkupPct(baseClp, markupPct);
    const currentPrice = Number.parseFloat(product.price.toString());

    if (Number.isFinite(currentPrice) && currentPrice === nextPrice) {
      await prisma.product.update({
        where: { id: product.id },
        data: {
          smmRate: event.newRate,
          smmSyncedAt: new Date(),
        },
      });
      continue;
    }

    const metrics = computePriceChangeMetrics(currentPrice, nextPrice);
    if (metrics) {
      priceEvents.push({
        productId: product.id,
        source: EVENT_SOURCE,
        oldPrice: currentPrice,
        newPrice: nextPrice,
        currency: product.currency || "CLP",
        changePct: metrics.changePct,
        direction: metrics.direction,
        oldSmmRate: event.oldRate,
        newSmmRate: event.newRate,
        smmMarkupPct: markupPct,
        remoteServiceId: event.remoteServiceId,
        providerId: event.providerId,
      });
    }

    await prisma.product.update({
      where: { id: product.id },
      data: {
        price: nextPrice,
        smmRate: event.newRate,
        smmSyncedAt: new Date(),
        sourceCostPrice: baseClp,
      },
    });
    updated += 1;
  }

  if (priceEvents.length > 0) {
    await prisma.productPriceChangeEvent.createMany({ data: priceEvents });
  }

  log.info(
    {
      remoteServiceId: event.remoteServiceId,
      products: products.length,
      updated,
      eventsPersisted: priceEvents.length,
      oldRate: event.oldRate,
      newRate: event.newRate,
    },
    "repriced SMM products after rate change",
  );
}

let registered = false;

/** Idempotent registration of SMM → product price listeners. */
export function registerSmmProductPriceHandlers(): void {
  if (registered) {
    return;
  }
  registered = true;
  onDomainEvent("smm.service.rate_changed", handleSmmServiceRateChanged);
}

export async function emitSmmServiceRateChanged(
  event: SmmServiceRateChangedEvent,
): Promise<void> {
  registerSmmProductPriceHandlers();
  await emitDomainEvent("smm.service.rate_changed", event);
}
