import "server-only";

import {
  extractKinguinProductGallery,
  hasUsableCoverUrl,
} from "@/lib/kinguin/product-images";
import { getKinguinSdk, isKinguinConfigured } from "@/lib/kinguin/client";
import { ProductImageSource } from "@/lib/generated/prisma/client";
import { replaceProductImages } from "@/lib/admin/products/persist-images";
import prisma from "@/lib/prisma";

export async function syncProductGalleryIfNeeded(
  productId: string,
): Promise<boolean> {
  const imageCount = await prisma.productImage.count({
    where: { productId },
  });

  if (imageCount > 0) {
    return false;
  }

  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: {
      coverImageUrl: true,
      kinguinProductId: true,
    },
  });

  if (!product) {
    return false;
  }

  if (hasUsableCoverUrl(product.coverImageUrl)) {
    await replaceProductImages(productId, [
      {
        url: product.coverImageUrl!.trim(),
        thumbnailUrl: product.coverImageUrl!.trim(),
        sortOrder: 0,
        isCover: true,
        source: ProductImageSource.KINGUIN,
      },
    ]);
    return true;
  }

  if (!isKinguinConfigured()) {
    return false;
  }

  const kinguinProduct = await getKinguinSdk().getProduct(
    product.kinguinProductId,
  );
  const gallery = extractKinguinProductGallery(kinguinProduct);

  if (gallery.length === 0) {
    return false;
  }

  await replaceProductImages(
    productId,
    gallery.map((item, index) => ({
      url: item.url,
      thumbnailUrl: item.thumbnailUrl,
      sortOrder: index,
      isCover: item.isCover,
      source: ProductImageSource.KINGUIN,
    })),
  );

  return true;
}

export async function syncAllProductGalleriesIfNeeded(): Promise<number> {
  const products = await prisma.product.findMany({
    select: { id: true, _count: { select: { images: true } } },
  });

  let fixed = 0;
  for (const product of products) {
    if (product._count.images > 0) {
      continue;
    }
    const updated = await syncProductGalleryIfNeeded(product.id);
    if (updated) {
      fixed += 1;
    }
  }

  return fixed;
}
