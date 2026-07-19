import "server-only";

import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import {
  IMAGE_MIME_TYPES,
  validateImageFile,
  validateMediaMetadata,
} from "@/lib/uploads/image";

type R2Config = {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  publicUrl: string;
};

type UploadedImage = {
  key: string;
  url: string;
};

const communicationMimeExtensions: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "text/plain": "txt",
  "text/csv": "csv",
};

let client: S3Client | undefined;

function getConfig(): R2Config {
  const config = {
    accountId: process.env.R2_ACCOUNT_ID,
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    bucket: process.env.R2_BUCKET,
    publicUrl: process.env.R2_PUBLIC_URL,
  };

  const missing = Object.entries(config)
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missing.length > 0) {
    throw new Error(`R2_CONFIG_MISSING:${missing.join(",")}`);
  }

  return config as R2Config;
}

function getClient(config: R2Config): S3Client {
  client ??= new S3Client({
    region: "auto",
    endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });

  return client;
}

function extensionFor(contentType: string): string {
  switch (contentType) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "image/avif":
      return "avif";
    case "video/mp4":
      return "mp4";
    case "video/webm":
      return "webm";
    case "video/quicktime":
      return "mov";
    default:
      throw new Error("INVALID_IMAGE_TYPE");
  }
}

export async function createR2UploadUrl(input: {
  contentType: string;
  size: number;
  folder: "products" | "categories";
}): Promise<UploadedImage & { uploadUrl: string }> {
  const validationMessage = validateMediaMetadata({
    type: input.contentType,
    size: input.size,
  });
  if (validationMessage) throw new Error(`INVALID_MEDIA:${validationMessage}`);

  const config = getConfig();
  const key = `${input.folder}/${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}.${extensionFor(input.contentType)}`;
  const command = new PutObjectCommand({
    Bucket: config.bucket,
    Key: key,
    ContentType: input.contentType,
    ContentLength: input.size,
    CacheControl: "public, max-age=31536000, immutable",
  });

  return {
    key,
    url: `${config.publicUrl.replace(/\/$/, "")}/${key}`,
    uploadUrl: await getSignedUrl(getClient(config), command, { expiresIn: 900 }),
  };
}

export async function uploadImageToR2(
  file: File,
  folder: "products" | "categories",
): Promise<UploadedImage> {
  const validationMessage = validateImageFile(file);
  if (validationMessage) {
    throw new Error(`INVALID_IMAGE:${validationMessage}`);
  }

  return putImageBytesToR2({
    folder,
    body: new Uint8Array(await file.arrayBuffer()),
    contentType: file.type,
  });
}

/**
 * Download a remote image and store it in R2 (server-side mirror).
 * Used when importing Kinguin products so the store does not hotlink CDNs.
 */
export async function uploadRemoteImageToR2(input: {
  sourceUrl: string;
  folder: "products" | "categories";
}): Promise<UploadedImage & { mimeType: string; sizeBytes: number; fileName: string }> {
  const sourceUrl = input.sourceUrl.trim();
  if (!/^https:\/\//i.test(sourceUrl)) {
    throw new Error("INVALID_REMOTE_IMAGE_URL");
  }

  const response = await fetch(sourceUrl, {
    method: "GET",
    redirect: "follow",
    signal: AbortSignal.timeout(30_000),
    headers: { Accept: "image/*,*/*;q=0.8" },
  });

  if (!response.ok) {
    throw new Error(`REMOTE_IMAGE_FETCH_FAILED:${response.status}`);
  }

  const headerType = response.headers.get("content-type")?.split(";")[0]?.trim() ?? "";
  const contentType = normalizeImageContentType(headerType, sourceUrl);
  if (!contentType) {
    throw new Error(`INVALID_REMOTE_IMAGE_TYPE:${headerType || "unknown"}`);
  }

  const buffer = new Uint8Array(await response.arrayBuffer());
  const validationMessage = validateMediaMetadata({
    type: contentType,
    size: buffer.byteLength,
  });
  if (validationMessage) {
    throw new Error(`INVALID_REMOTE_IMAGE:${validationMessage}`);
  }

  const uploaded = await putImageBytesToR2({
    folder: input.folder,
    body: buffer,
    contentType,
  });

  return {
    ...uploaded,
    mimeType: contentType,
    sizeBytes: buffer.byteLength,
    fileName: fileNameFromUrl(sourceUrl, contentType),
  };
}

async function putImageBytesToR2(input: {
  folder: "products" | "categories";
  body: Uint8Array;
  contentType: string;
}): Promise<UploadedImage> {
  const config = getConfig();
  const key = `${input.folder}/${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}.${extensionFor(input.contentType)}`;

  await getClient(config).send(
    new PutObjectCommand({
      Bucket: config.bucket,
      Key: key,
      Body: input.body,
      ContentType: input.contentType,
      CacheControl: "public, max-age=31536000, immutable",
    }),
  );

  return {
    key,
    url: `${config.publicUrl.replace(/\/$/, "")}/${key}`,
  };
}

function normalizeImageContentType(
  headerType: string,
  sourceUrl: string,
): string | null {
  const normalized = headerType.toLowerCase();
  if (normalized === "image/jpg") return "image/jpeg";
  if (IMAGE_MIME_TYPES.includes(normalized as (typeof IMAGE_MIME_TYPES)[number])) {
    return normalized;
  }

  const path = sourceUrl.split("?")[0]?.toLowerCase() ?? "";
  if (path.endsWith(".jpg") || path.endsWith(".jpeg")) return "image/jpeg";
  if (path.endsWith(".png")) return "image/png";
  if (path.endsWith(".webp")) return "image/webp";
  if (path.endsWith(".avif")) return "image/avif";
  return null;
}

function fileNameFromUrl(sourceUrl: string, contentType: string): string {
  try {
    const base = decodeURIComponent(
      new URL(sourceUrl).pathname.split("/").filter(Boolean).at(-1) ?? "",
    );
    if (base && /\.[a-z0-9]+$/i.test(base)) {
      return base.slice(0, 180);
    }
  } catch {
    // ignore bad URLs
  }
  return `image.${extensionFor(contentType)}`;
}

export async function deleteImageFromR2(key: string): Promise<void> {
  const config = getConfig();
  await getClient(config).send(
    new DeleteObjectCommand({
      Bucket: config.bucket,
      Key: key,
    }),
  );
}

export async function createCommunicationAttachmentUploadUrl(input: { contentType: string; size: number }) {
  const extension = communicationMimeExtensions[input.contentType];
  if (!extension || input.size <= 0 || input.size > 10 * 1024 * 1024) throw new Error("INVALID_ATTACHMENT");
  const config = getConfig();
  const key = `communications/${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}.${extension}`;
  const command = new PutObjectCommand({ Bucket: config.bucket, Key: key, ContentType: input.contentType, ContentLength: input.size, CacheControl: "private, no-store" });
  return { key, uploadUrl: await getSignedUrl(getClient(config), command, { expiresIn: 600 }) };
}

export async function verifyCommunicationAttachment(input: { key: string; contentType: string; size: number }) {
  const config = getConfig();
  const result = await getClient(config).send(new HeadObjectCommand({ Bucket: config.bucket, Key: input.key }));
  if (result.ContentType !== input.contentType || Number(result.ContentLength) !== input.size) throw new Error("ATTACHMENT_MISMATCH");
}

export async function getCommunicationAttachmentUrl(key: string) {
  const config = getConfig();
  return getSignedUrl(getClient(config), new GetObjectCommand({ Bucket: config.bucket, Key: key }), { expiresIn: 300 });
}
