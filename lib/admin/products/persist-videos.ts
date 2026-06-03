import "server-only";

import { ProductImageSource } from "@/lib/generated/prisma/client";
import prisma from "@/lib/prisma";

export type PersistProductVideoInput = {
  youtubeVideoId: string;
  title?: string | null;
  sortOrder: number;
  source?: ProductImageSource;
};

export function normalizeProductVideos(
  videos: PersistProductVideoInput[],
): PersistProductVideoInput[] {
  return [...videos]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((video, index) => ({
      ...video,
      youtubeVideoId: video.youtubeVideoId.trim(),
      title: video.title?.trim() || null,
      sortOrder: index,
    }));
}

export async function replaceProductVideos(
  productId: string,
  videos: PersistProductVideoInput[],
): Promise<void> {
  const normalized = normalizeProductVideos(videos);

  await prisma.$transaction([
    prisma.productVideo.deleteMany({ where: { productId } }),
    ...(normalized.length > 0
      ? [
          prisma.productVideo.createMany({
            data: normalized.map((video) => ({
              productId,
              youtubeVideoId: video.youtubeVideoId,
              title: video.title,
              sortOrder: video.sortOrder,
              source: video.source ?? ProductImageSource.MANUAL,
            })),
          }),
        ]
      : []),
  ]);
}
