import "server-only";

import { isKinguinConfigured, getKinguinSdk } from "@/lib/kinguin/client";
import {
  hasUsableCoverUrl,
  resolveKinguinProductCoverUrl,
} from "@/lib/kinguin/product-images";
import prisma from "@/lib/prisma";

export async function syncProductCoverFromKinguinIfNeeded(
  productId: string,
): Promise<boolean> {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { coverImageUrl: true, kinguinProductId: true },
  });

  if (!product || hasUsableCoverUrl(product.coverImageUrl)) {
    return false;
  }

  if (!isKinguinConfigured()) {
    return false;
  }

  const kinguinProduct = await getKinguinSdk().getProduct(
    product.kinguinProductId,
  );
  const coverImageUrl = resolveKinguinProductCoverUrl(kinguinProduct);

  if (!coverImageUrl) {
    return false;
  }

  await prisma.product.update({
    where: { id: productId },
    data: { coverImageUrl },
  });

  return true;
}

export async function syncAllProductCoversFromKinguinIfNeeded(): Promise<number> {
  if (!isKinguinConfigured()) {
    return 0;
  }

  const products = await prisma.product.findMany({
    select: { id: true, coverImageUrl: true },
  });

  const missing = products.filter((p) => !hasUsableCoverUrl(p.coverImageUrl));

  let fixed = 0;
  for (const { id } of missing) {
    const updated = await syncProductCoverFromKinguinIfNeeded(id);
    if (updated) {
      fixed += 1;
    }
  }

  return fixed;
}
