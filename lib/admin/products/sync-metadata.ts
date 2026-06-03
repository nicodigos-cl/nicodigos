import "server-only";

import { mapKinguinProductMetadata } from "@/lib/admin/products/kinguin-metadata";
import { getKinguinSdk, isKinguinConfigured } from "@/lib/kinguin/client";
import prisma from "@/lib/prisma";

function needsMetadataSync(product: {
  activationDetails: string | null;
  regionName: string | null;
  regionId: number | null;
}): boolean {
  if (!product.activationDetails?.trim()) {
    return true;
  }
  return product.regionId != null && !product.regionName?.trim();
}

export async function syncProductMetadataFromKinguinIfNeeded(
  productId: string,
): Promise<boolean> {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: {
      kinguinProductId: true,
      activationDetails: true,
      regionName: true,
      regionId: true,
    },
  });

  if (!product || !needsMetadataSync(product)) {
    return false;
  }

  if (!isKinguinConfigured()) {
    return false;
  }

  const kinguinProduct = await getKinguinSdk().getProduct(
    product.kinguinProductId,
  );
  const metadata = await mapKinguinProductMetadata(kinguinProduct);

  await prisma.product.update({
    where: { id: productId },
    data: metadata,
  });

  return true;
}

export async function syncAllProductMetadataFromKinguinIfNeeded(): Promise<number> {
  if (!isKinguinConfigured()) {
    return 0;
  }

  const products = await prisma.product.findMany({
    select: {
      id: true,
      activationDetails: true,
      regionName: true,
      regionId: true,
    },
  });

  let fixed = 0;
  for (const product of products) {
    if (!needsMetadataSync(product)) {
      continue;
    }
    const updated = await syncProductMetadataFromKinguinIfNeeded(product.id);
    if (updated) {
      fixed += 1;
    }
  }

  return fixed;
}
