export type AssetDraft = {
  localId: string;
  id?: string;
  type: "IMAGE" | "VIDEO" | "YOUTUBE";
  url: string;
  objectKey: string | null;
  youtubeId: string | null;
  mimeType: string | null;
  fileName: string | null;
  sizeBytes: number | null;
  thumbnailUrl: string | null;
  altText: string | null;
  sortOrder: number;
  isCover: boolean;
};
