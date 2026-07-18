import { z } from "zod";

export const assetInputSchema = z.object({
  id: z.string().min(1).max(100).optional(),
  type: z.enum(["IMAGE", "VIDEO", "YOUTUBE"]),
  url: z.string().url().max(2000),
  objectKey: z.string().min(1).max(1000).nullable().optional(),
  youtubeId: z.string().min(6).max(32).nullable().optional(),
  mimeType: z.string().max(120).nullable().optional(),
  fileName: z.string().max(255).nullable().optional(),
  sizeBytes: z.coerce.number().int().positive().max(250 * 1024 * 1024).nullable().optional(),
  thumbnailUrl: z.string().url().max(2000).nullable().optional(),
  altText: z.string().trim().max(300).nullable().optional(),
  sortOrder: z.coerce.number().int().min(0),
  isCover: z.coerce.boolean(),
});

export const assetsInputSchema = z.array(assetInputSchema).max(30);
export type AssetInput = z.infer<typeof assetInputSchema>;

export function parseYouTubeUrl(value: string): { id: string; url: string } | null {
  try {
    const url = new URL(value.trim());
    let id: string | null = null;
    if (url.hostname === "youtu.be") id = url.pathname.slice(1).split("/")[0] ?? null;
    if (url.hostname === "youtube.com" || url.hostname.endsWith(".youtube.com")) {
      id = url.searchParams.get("v") ?? url.pathname.match(/^\/(?:shorts|embed)\/([^/?]+)/)?.[1] ?? null;
    }
    if (!id || !/^[A-Za-z0-9_-]{6,32}$/.test(id)) return null;
    return { id, url: `https://www.youtube.com/watch?v=${id}` };
  } catch {
    return null;
  }
}
