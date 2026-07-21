import "server-only";

import { createLogger } from "@/lib/logger";
import { uploadRemoteImageToR2 } from "@/lib/r2";
import type { AssetInput } from "@/lib/validations/assets";
import type { KinguinProduct } from "@/types/kinguin";

const log = createLogger({ module: "kinguin-mirror-images" });

export type MirroredKinguinImageAsset = {
  url: string;
  objectKey: string;
  thumbnailUrl: string | null;
  mimeType: string | null;
  fileName: string | null;
  sizeBytes: bigint | null;
  sortOrder: number;
  isCover: boolean;
};

export type MirroredKinguinImages = {
  coverImageUrl: string | null;
  assets: MirroredKinguinImageAsset[];
};

/**
 * Download Kinguin cover + screenshots and upload them to R2.
 * Network I/O must run outside Prisma transactions.
 */
export async function mirrorKinguinProductImages(
  remote: KinguinProduct,
): Promise<MirroredKinguinImages> {
  const assets: MirroredKinguinImageAsset[] = [];

  const coverUrl = remote.images?.cover?.url?.trim() || null;

  if (coverUrl) {
    const mirrored = await mirrorOne(coverUrl, {
      sortOrder: 0,
      isCover: true,
    });
    if (mirrored) {
      assets.push(mirrored);
    }
  }

  const screenshots = remote.images?.screenshots ?? [];
  let sortOrder = 1;
  for (const shot of screenshots.filter((item) => item.url).slice(0, 12)) {
    const mirrored = await mirrorOne(shot.url as string, {
      sortOrder,
      isCover: false,
    });
    if (mirrored) {
      assets.push(mirrored);
      sortOrder += 1;
    }
  }

  return {
    coverImageUrl:
      assets.find((asset) => asset.isCover)?.url ?? assets[0]?.url ?? null,
    assets,
  };
}

/** Map mirrored R2 images into product-import asset payloads. */
export function mirroredImagesToAssetInputs(
  mirrored: MirroredKinguinImages,
): AssetInput[] {
  return mirrored.assets.map((asset) => ({
    type: "IMAGE" as const,
    url: asset.url,
    objectKey: asset.objectKey,
    thumbnailUrl: asset.thumbnailUrl,
    mimeType: asset.mimeType,
    fileName: asset.fileName,
    sizeBytes: asset.sizeBytes != null ? Number(asset.sizeBytes) : null,
    sortOrder: asset.sortOrder,
    isCover: asset.isCover,
  }));
}

/** YouTube trailers from Kinguin (no R2 upload). */
export function kinguinVideosToAssetInputs(
  remote: KinguinProduct,
  startSortOrder = 0,
): AssetInput[] {
  return (remote.videos ?? [])
    .filter((video) => Boolean(video.video_id))
    .slice(0, 8)
    .map((video, index) => {
      const youtubeId = video.video_id as string;
      return {
        type: "YOUTUBE" as const,
        youtubeId,
        url: `https://www.youtube.com/watch?v=${youtubeId}`,
        thumbnailUrl: `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`,
        sortOrder: startSortOrder + index,
        isCover: false,
      };
    });
}

async function mirrorOne(
  sourceUrl: string,
  meta: { sortOrder: number; isCover: boolean },
): Promise<MirroredKinguinImageAsset | null> {
  try {
    const uploaded = await uploadRemoteImageToR2({
      sourceUrl,
      folder: "products",
    });

    return {
      url: uploaded.url,
      objectKey: uploaded.key,
      thumbnailUrl: uploaded.url,
      mimeType: uploaded.mimeType,
      fileName: uploaded.fileName,
      sizeBytes: BigInt(uploaded.sizeBytes),
      sortOrder: meta.sortOrder,
      isCover: meta.isCover,
    };
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.startsWith("R2_CONFIG_MISSING:")
    ) {
      throw error;
    }
    log.warn({ err: error, sourceUrl }, "kinguin.image.mirror_failed");
    return null;
  }
}
