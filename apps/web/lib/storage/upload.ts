/**
 * File Upload and Storage Utilities
 * Local filesystem storage with API route serving
 */

import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

export type StorageProvider = "local";

interface UploadResult {
  url: string;
  key: string;
  size: number;
  contentType: string;
}

const UPLOAD_DIR = process.env.UPLOAD_DIR || "/app/uploads";

/**
 * Ensure directory exists
 */
async function ensureDir(dirPath: string): Promise<void> {
  await fs.mkdir(dirPath, { recursive: true });
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
 * Get content type from file extension
 */
function getContentTypeFromExt(ext: string): string {
  const types: Record<string, string> = {
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    webp: "image/webp",
    gif: "image/gif",
    mp4: "video/mp4",
    webm: "video/webm",
    svg: "image/svg+xml",
  };
  return types[ext.toLowerCase()] || "application/octet-stream";
}

/**
 * Get public URL for a storage key
 */
export function getPublicUrl(key: string): string {
  return `/api/uploads/${key}`;
}

/**
 * Upload file to local storage
 */
export async function uploadFile(
  file: Buffer | Uint8Array,
  userId: string,
  filename: string,
  contentType: string,
  folder: string = "uploads"
): Promise<UploadResult> {
  const key = generateFileKey(userId, filename, folder);
  const filePath = path.join(UPLOAD_DIR, key);

  await ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, file);

  return {
    url: getPublicUrl(key),
    key,
    size: file.length,
    contentType,
  };
}

/**
 * Upload base64 image to local storage
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
 * Get presigned upload URL — for local storage, returns a direct upload endpoint
 */
export async function getPresignedUploadUrl(
  userId: string,
  filename: string,
  contentType: string
): Promise<{ uploadUrl: string; key: string; publicUrl: string }> {
  const key = generateFileKey(userId, filename, "uploads");

  return {
    uploadUrl: `/api/upload?key=${encodeURIComponent(key)}`,
    key,
    publicUrl: getPublicUrl(key),
  };
}

/**
 * Delete file from local storage
 */
export async function deleteFile(key: string): Promise<void> {
  const filePath = path.join(UPLOAD_DIR, key);
  // Prevent path traversal
  const resolved = path.resolve(filePath);
  if (!resolved.startsWith(path.resolve(UPLOAD_DIR))) {
    throw new Error("Invalid file path");
  }
  try {
    await fs.unlink(resolved);
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw error;
    }
  }
}

/**
 * Validate URL to prevent SSRF attacks
 */
function isAllowedUrl(urlString: string): boolean {
  try {
    const url = new URL(urlString);

    // Only allow HTTPS (and HTTP in development/internal only)
    const allowedProtocols = ["https:", "http:"];
    if (!allowedProtocols.includes(url.protocol)) {
      return false;
    }

    const hostname = url.hostname.toLowerCase();

    // Allow internal ComfyUI server (from GPU_SERVER_HOST env var)
    const gpuServerHost = process.env.GPU_SERVER_HOST || process.env.COMFYUI_HOST;
    if (gpuServerHost && hostname === gpuServerHost.toLowerCase()) {
      return true; // Allow internal GPU server
    }

    // Block localhost and common internal hostnames
    const blockedHostnames = [
      "localhost",
      "127.0.0.1",
      "0.0.0.0",
      "[::1]",
      "metadata.google.internal",
      "169.254.169.254", // AWS/GCP metadata
      "metadata.azure.internal",
    ];
    if (blockedHostnames.includes(hostname)) {
      return false;
    }

    // Block internal/private IP ranges (except whitelisted GPU server — already handled above)
    const ipv4Match = hostname.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
    if (ipv4Match) {
      const [, a, b] = ipv4Match.map(Number);
      // 10.0.0.0/8
      if (a === 10) return false;
      // 172.16.0.0/12
      if (a === 172 && b >= 16 && b <= 31) return false;
      // 192.168.0.0/16
      if (a === 192 && b === 168) return false;
      // 169.254.0.0/16 (link-local)
      if (a === 169 && b === 254) return false;
      // 127.0.0.0/8 (loopback)
      if (a === 127) return false;
    }

    // Whitelist of allowed domains for AI provider images
    const allowedDomains = [
      "fal.media",
      "replicate.delivery",
      "replicate.com",
      "oaidalleapiprodscus.blob.core.windows.net", // OpenAI DALL-E
      "pbxt.replicate.delivery",
      "together.ai",
      "api.together.xyz",
    ];

    const isAllowedDomain = allowedDomains.some(
      domain => hostname === domain || hostname.endsWith(`.${domain}`)
    );

    if (!isAllowedDomain) {
      console.warn(`[SSRF] Blocked fetch to non-whitelisted domain: ${hostname}`);
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Upload image from URL to local storage (for caching external images)
 * Protected against SSRF attacks
 */
export async function uploadFromUrl(
  imageUrl: string,
  userId: string
): Promise<UploadResult> {
  // Validate URL to prevent SSRF
  if (!isAllowedUrl(imageUrl)) {
    throw new Error("URL not allowed: must be HTTPS from a whitelisted AI provider domain");
  }

  const response = await fetch(imageUrl, {
    headers: {
      "User-Agent": "Krya/1.0",
    },
    redirect: "follow",
    signal: AbortSignal.timeout(30000), // 30 second timeout
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.status}`);
  }

  // Validate content type
  const contentType = response.headers.get("content-type") || "";
  const allowedContentTypes = ["image/png", "image/jpeg", "image/webp", "image/gif", "video/mp4", "video/webm"];
  if (!allowedContentTypes.some(t => contentType.startsWith(t))) {
    throw new Error(`Invalid content type: ${contentType}`);
  }

  // Determine max size based on content type (videos can be larger)
  const isVideo = contentType.startsWith("video/");
  const maxSize = isVideo ? 200 * 1024 * 1024 : 50 * 1024 * 1024; // 200MB for videos, 50MB for images

  // Limit file size
  const contentLength = response.headers.get("content-length");
  if (contentLength && parseInt(contentLength) > maxSize) {
    throw new Error(`File too large (max ${isVideo ? '200' : '50'}MB)`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());

  // Double check size after download
  if (buffer.length > maxSize) {
    throw new Error(`File too large (max ${isVideo ? '200' : '50'}MB)`);
  }

  const ext = contentType.split("/")[1]?.split(";")[0] || "png";

  return uploadFile(buffer, userId, `image.${ext}`, contentType, "generations");
}
