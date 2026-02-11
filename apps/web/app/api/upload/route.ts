import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getPresignedUploadUrl, uploadBase64Image } from "@/lib/storage/upload";
import { z } from "zod";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { randomUUID } from "crypto";

// Schema for presigned URL request
const presignedUrlSchema = z.object({
  filename: z.string().min(1),
  contentType: z.string().regex(/^(image|video)\/.+$/),
  size: z.number().max(100 * 1024 * 1024), // Max 100MB
});

// Schema for direct upload (base64)
const directUploadSchema = z.object({
  data: z.string(), // Base64 encoded
  filename: z.string().optional(),
  folder: z.string().optional(),
});

// Handle file uploads
export async function POST(req: NextRequest) {
  try {
    const session = await auth(req);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const contentType = req.headers.get("content-type") || "";

    // Check if this is a multipart form data upload (file upload)
    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;

      if (!file) {
        return NextResponse.json({ error: "No file provided" }, { status: 400 });
      }

      // Validate file type
      if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {
        return NextResponse.json(
          { error: "Only image and video files are allowed" },
          { status: 400 }
        );
      }

      // Validate file size (max 100MB)
      if (file.size > 100 * 1024 * 1024) {
        return NextResponse.json(
          { error: "File size exceeds 100MB limit" },
          { status: 400 }
        );
      }

      // Generate unique filename
      const ext = file.name.split(".").pop() || "bin";
      const filename = `${randomUUID()}.${ext}`;

      // Save to temp directory for immediate use (e.g., img2img reference images)
      const uploadDir = join(process.env.UPLOAD_DIR || "/app/uploads", "temp");
      const filePath = join(uploadDir, filename);

      // Ensure directory exists
      await mkdir(uploadDir, { recursive: true });

      // Write file to disk
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      await writeFile(filePath, buffer);

      console.log('[Upload] File saved:', { filename, size: file.size, type: file.type });

      // Return file URL
      const fileUrl = `/api/uploads/temp/${filename}`;

      return NextResponse.json({
        success: true,
        url: fileUrl,
        filename,
        size: file.size,
        type: file.type,
      });
    }

    // Otherwise, try to parse as JSON for base64 or presigned URL requests
    const body = await req.json();

    // Check if it's a presigned URL request or direct upload
    if (body.data) {
      // Direct base64 upload
      const validated = directUploadSchema.safeParse(body);

      if (!validated.success) {
        return NextResponse.json(
          { error: "Invalid request", details: validated.error.issues },
          { status: 400 }
        );
      }

      const result = await uploadBase64Image(
        validated.data.data,
        session.user.id,
        validated.data.folder
      );

      return NextResponse.json(result);
    } else {
      // Presigned URL request
      const validated = presignedUrlSchema.safeParse(body);

      if (!validated.success) {
        return NextResponse.json(
          { error: "Invalid request", details: validated.error.issues },
          { status: 400 }
        );
      }

      const { filename, contentType, size } = validated.data;

      // Check user's storage quota
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { subscriptionTier: true },
      });

      if (!user) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }

      // Storage limits by tier (in bytes)
      const storageLimits: Record<string, number> = {
        FREE: 1 * 1024 * 1024 * 1024, // 1 GB
        BASIC: 10 * 1024 * 1024 * 1024, // 10 GB
        PRO: 50 * 1024 * 1024 * 1024, // 50 GB
        MAX: 200 * 1024 * 1024 * 1024, // 200 GB
        TEAM: 500 * 1024 * 1024 * 1024, // 500 GB
        ENTERPRISE: -1, // Unlimited
      };

      const limit = storageLimits[user.subscriptionTier] || storageLimits.FREE;

      // Check if file would exceed quota (skip for enterprise)
      if (limit !== -1) {
        const currentUsage = await calculateStorageUsage(session.user.id);
        if (currentUsage + size > limit) {
          return NextResponse.json(
            {
              error: "Storage quota exceeded",
              currentUsage,
              limit,
              required: size,
            },
            { status: 403 }
          );
        }
      }

      // Get presigned URL
      const result = await getPresignedUploadUrl(
        session.user.id,
        filename,
        contentType
      );

      return NextResponse.json(result);
    }
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Calculate user's storage usage
async function calculateStorageUsage(userId: string): Promise<number> {
  // In production, this would query actual storage sizes
  // For now, estimate based on generation counts

  const [generations, videos] = await Promise.all([
    prisma.generation.count({ where: { userId, imageUrl: { not: null } } }),
    prisma.video.count({ where: { userId, videoUrl: { not: null } } }),
  ]);

  // Estimate: 2MB per image, 50MB per video
  const estimatedUsage = generations * 2 * 1024 * 1024 + videos * 50 * 1024 * 1024;

  return estimatedUsage;
}

// Confirm upload completed
export async function PUT(req: NextRequest) {
  try {
    const session = await auth(req);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { key, url, type } = z
      .object({
        key: z.string(),
        url: z.string().url(),
        type: z.enum(["image", "video", "model", "document"]).default("image"),
      })
      .parse(body);

    // Store upload record
    // In a real app, you'd have an uploads table
    // For now, we'll just return success

    return NextResponse.json({
      success: true,
      key,
      url,
      type,
    });
  } catch (error) {
    console.error("Upload confirmation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
