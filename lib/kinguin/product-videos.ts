import { parseYoutubeVideoId, youtubeWatchUrl } from "@/lib/youtube";
import type { KinguinProduct, KinguinVideo } from "@/types/kinguin";

export type KinguinVideoItem = {
  youtubeVideoId: string;
  title: string | null;
};

function mapKinguinVideo(video: KinguinVideo): KinguinVideoItem | null {
  const fromUrl = video.video_url ? parseYoutubeVideoId(video.video_url) : null;
  const fromId = parseYoutubeVideoId(video.video_id);
  const youtubeVideoId = fromUrl ?? fromId;

  if (!youtubeVideoId) {
    return null;
  }

  return {
    youtubeVideoId,
    title: null,
  };
}

export function extractKinguinProductVideos(
  product: Pick<KinguinProduct, "videos">,
): KinguinVideoItem[] {
  const items: KinguinVideoItem[] = [];
  const seen = new Set<string>();

  for (const video of product.videos ?? []) {
    const mapped = mapKinguinVideo(video);
    if (!mapped || seen.has(mapped.youtubeVideoId)) {
      continue;
    }
    seen.add(mapped.youtubeVideoId);
    items.push(mapped);
  }

  return items;
}

export function kinguinVideoToWatchUrl(video: KinguinVideo): string | null {
  const item = mapKinguinVideo(video);
  return item ? youtubeWatchUrl(item.youtubeVideoId) : null;
}
