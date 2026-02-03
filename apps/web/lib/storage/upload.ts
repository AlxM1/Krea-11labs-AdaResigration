/**
 * File Upload and Storage Utilities
 * Supports Cloudflare R2, AWS S3, and local storage
 */

import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import crypto from "crypto";

export type StorageProvider = "r2" | "s3" | "local";

interface UploadResult {
  url: string;
  key: string;
  size: number;
  contentType: string;
}

interface StorageConfig {
  provider: StorageProvider;
  bucket: string;
  region?: string;
  endpoint?: string;
  accessKeyId: string;
  secretAccessKey: string;
  publicUrl?: string;
}

/**
 * Get storage configuration from environment
 */
function getStorageConfig(): StorageConfig {
  const provider = (process.env.STORAGE_PROVIDER || "r2") as StorageProvider;

  if (provider === "r2") {
    return {
      provider: "r2",
      bucket: process.env.R2_BUCKET_NAME || "krya-uploads",
      endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
      publicUrl: process.env.R2_PUBLIC_URL,
    };
  }

  return {
    provider: "s3",
    bucket: process.env.S3_BUCKET_NAME || "krya-uploads",
    region: process.env.AWS_REGION || "us-east-1",
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  };
}

/**
 * Create S3 client for storage operations
 */
function createStorageClient(): S3Client {
  const config = getStorageConfig();

  return new S3Client({
    region: config.region || "auto",
    endpoint: config.endpoint,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });
}

/**
 * Generate unique file key
 */
function generateFileKey(userId: string, filename: string, folder: string = "uploads"): string {
  const ext = filename.split(".").pop() || "png";
  const hash = crypto.randomBytes(8).toString("hex");
  const timestamp = Date.now();
  return `${folder}/${userId}/${timestamp}-${hash}.${ext}`;
}

/**
 * Upload file to storage
 */
export async function uploadFile(
  file: Buffer | Uint8Array,
  userId: string,
  filename: string,
  contentType: string,
  folder: string = "uploads"
): Promise<UploadResult> {
  const config = getStorageConfig();
  const client = createStorageClient();
  const key = generateFileKey(userId, filename, folder);

  const command = new PutObjectCommand({
    Bucket: config.bucket,
    Key: key,
    Body: file,
    ContentType: contentType,
    CacheControl: "public, max-age=31536000",
  });

  await client.send(command);

  const url = config.publicUrl
    ? `${config.publicUrl}/${key}`
    : `https://${config.bucket}.s3.${config.region}.amazonaws.com/${key}`;

  return {
    url,
    key,
    size: file.length,
    contentType,
  };
}

/**
 * Upload base64 image to storage
 */
export async function uploadBase64Image(
  base64: string,
  userId: string,
  filename: string = "image.png"
): Promise<UploadResult> {
  // Remove data URL prefix if present
  const base64Data = base64.replace(/^data:image\/\w+;base64,/, "");
  const buffer = Buffer.from(base64Data, "base64");

  // Detect content type from base64 prefix
  const contentType = base64.startsWith("data:image/png")
    ? "image/png"
    : base64.startsWith("data:image/jpeg")
    ? "image/jpeg"
    : base64.startsWith("data:image/webp")
    ? "image/webp"
    : "image/png";

  return uploadFile(buffer, userId, filename, contentType, "generations");
}

/**
 * Get presigned URL for direct upload
 */
export async function getPresignedUploadUrl(
  userId: string,
  filename: string,
  contentType: string
): Promise<{ uploadUrl: string; key: string; publicUrl: string }> {
  const config = getStorageConfig();
  const client = createStorageClient();
  const key = generateFileKey(userId, filename, "uploads");

  const command = new PutObjectCommand({
    Bucket: config.bucket,
    Key: key,
    ContentType: contentType,
  });

  const uploadUrl = await getSignedUrl(client, command, { expiresIn: 3600 });

  const publicUrl = config.publicUrl
    ? `${config.publicUrl}/${key}`
    : `https://${config.bucket}.s3.${config.region}.amazonaws.com/${key}`;

  return {
    uploadUrl,
    key,
    publicUrl,
  };
}

/**
 * Delete file from storage
 */
export async function deleteFile(key: string): Promise<void> {
  const config = getStorageConfig();
  const client = createStorageClient();

  const command = new DeleteObjectCommand({
    Bucket: config.bucket,
    Key: key,
  });

  await client.send(command);
}

/**
 * Get presigned URL for download
 */
export async function getPresignedDownloadUrl(key: string): Promise<string> {
  const config = getStorageConfig();
  const client = createStorageClient();

  const command = new GetObjectCommand({
    Bucket: config.bucket,
    Key: key,
  });

  return getSignedUrl(client, command, { expiresIn: 3600 });
}

/**
 * Upload image from URL to storage (for caching external images)
 */
export async function uploadFromUrl(
  imageUrl: string,
  userId: string
): Promise<UploadResult> {
  const response = await fetch(imageUrl);
  const buffer = Buffer.from(await response.arrayBuffer());
  const contentType = response.headers.get("content-type") || "image/png";
  const ext = contentType.split("/")[1] || "png";

  return uploadFile(buffer, userId, `image.${ext}`, contentType, "generations");
}
