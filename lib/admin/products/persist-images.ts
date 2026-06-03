import "server-only";

import { ProductImageSource } from "@/lib/generated/prisma/client";
import prisma from "@/lib/prisma";

export type PersistProductImageInput = {
  url: string;
  thumbnailUrl?: string | null;
  sortOrder: number;
  isCover: boolean;
  source?: ProductImageSource;
};

export function normalizeProductImages(images: PersistProductImageInput[]): {
  images: PersistProductImageInput[];
  coverImageUrl: string | null;
} {
  const sorted = [...images].sort((a, b) => a.sortOrder - b.sortOrder);
  let coverIndex = sorted.findIndex((item) => item.isCover);
  if (coverIndex < 0 && sorted.length > 0) {
    coverIndex = 0;
  }

  const normalized = sorted.map((item, index) => ({
    ...item,
    url: item.url.trim(),
    thumbnailUrl: item.thumbnailUrl?.trim() || item.url.trim(),
    sortOrder: index,
    isCover: index === coverIndex,
  }));

  const cover = normalized.find((item) => item.isCover);

  return {
    images: normalized,
    coverImageUrl: cover?.url ?? null,
  };
}

export async function replaceProductImages(
  productId: string,
  images: PersistProductImageInput[],
): Promise<void> {
  const { images: normalized, coverImageUrl } = normalizeProductImages(images);

  await prisma.$transaction([
    prisma.productImage.deleteMany({ where: { productId } }),
    ...(normalized.length > 0
      ? [
          prisma.productImage.createMany({
            data: normalized.map((item) => ({
              productId,
              url: item.url,
              thumbnailUrl: item.thumbnailUrl ?? item.url,
              sortOrder: item.sortOrder,
              isCover: item.isCover,
              source: item.source ?? ProductImageSource.MANUAL,
            })),
          }),
        ]
      : []),
    prisma.product.update({
      where: { id: productId },
      data: { coverImageUrl },
    }),
  ]);
}
