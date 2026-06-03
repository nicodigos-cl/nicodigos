import "server-only";

import { extractKinguinProductVideos } from "@/lib/kinguin/product-videos";
import { getKinguinSdk, isKinguinConfigured } from "@/lib/kinguin/client";
import { ProductImageSource } from "@/lib/generated/prisma/client";
import { replaceProductVideos } from "@/lib/admin/products/persist-videos";
import prisma from "@/lib/prisma";

export async function syncProductVideosIfNeeded(
  productId: string,
): Promise<boolean> {
  const count = await prisma.productVideo.count({ where: { productId } });
  if (count > 0) {
    return false;
  }

  if (!isKinguinConfigured()) {
    return false;
  }

  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { kinguinProductId: true },
  });

  if (!product) {
    return false;
  }

  const kinguinProduct = await getKinguinSdk().getProduct(
    product.kinguinProductId,
  );
  const videos = extractKinguinProductVideos(kinguinProduct);

  if (videos.length === 0) {
    return false;
  }

  await replaceProductVideos(
    productId,
    videos.map((video, index) => ({
      youtubeVideoId: video.youtubeVideoId,
      title: video.title,
      sortOrder: index,
      source: ProductImageSource.KINGUIN,
    })),
  );

  return true;
}

export async function syncAllProductVideosIfNeeded(): Promise<number> {
  if (!isKinguinConfigured()) {
    return 0;
  }

  const products = await prisma.product.findMany({
    select: { id: true, _count: { select: { videos: true } } },
  });

  let fixed = 0;
  for (const product of products) {
    if (product._count.videos > 0) {
      continue;
    }
    const updated = await syncProductVideosIfNeeded(product.id);
    if (updated) {
      fixed += 1;
    }
  }

  return fixed;
}
