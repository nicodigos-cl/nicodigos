import "server-only";

import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { validateImageFile, validateMediaMetadata } from "@/lib/uploads/image";

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

  const config = getConfig();
  const key = `${folder}/${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}.${extensionFor(file.type)}`;

  await getClient(config).send(
    new PutObjectCommand({
      Bucket: config.bucket,
      Key: key,
      Body: new Uint8Array(await file.arrayBuffer()),
      ContentType: file.type,
      CacheControl: "public, max-age=31536000, immutable",
    }),
  );

  return {
    key,
    url: `${config.publicUrl.replace(/\/$/, "")}/${key}`,
  };
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
