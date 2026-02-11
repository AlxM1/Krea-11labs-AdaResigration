import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { readFile } from "fs/promises";
import { join } from "path";

/**
 * GET /api/generations/:id/download - Download a generation file
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const generation = await prisma.generation.findUnique({
      where: { id },
    });

    if (!generation || !generation.imageUrl) {
      return NextResponse.json(
        { error: "Generation not found or has no file" },
        { status: 404 }
      );
    }

    // If it's an external URL, redirect
    if (generation.imageUrl.startsWith("http")) {
      return NextResponse.redirect(generation.imageUrl);
    }

    // If it's a local file, serve it
    if (generation.imageUrl.startsWith("/api/uploads/")) {
      const filePath = generation.imageUrl.replace("/api/uploads/", "");
      const fullPath = join(process.env.UPLOAD_DIR || "/app/uploads", filePath);

      try {
        const fileBuffer = await readFile(fullPath);
        const ext = filePath.split(".").pop() || "png";
        const contentType = ext === "mp4" ? "video/mp4" : ext === "webm" ? "video/webm" : `image/${ext}`;

        return new NextResponse(fileBuffer, {
          headers: {
            "Content-Type": contentType,
            "Content-Disposition": `attachment; filename="krya-${id}.${ext}"`,
          },
        });
      } catch (error) {
        console.error("File read error:", error);
        return NextResponse.json(
          { error: "Failed to read file" },
          { status: 500 }
        );
      }
    }

    return NextResponse.json(
      { error: "Invalid file URL" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Download error:", error);
    return NextResponse.json(
      { error: "Failed to download file" },
      { status: 500 }
    );
  }
}
