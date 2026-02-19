import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

const UPLOAD_DIR = process.env.UPLOAD_DIR || "/app/uploads";

const CONTENT_TYPES: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".svg": "image/svg+xml",
};

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path: segments } = await params;
    const filePath = path.join(UPLOAD_DIR, ...segments);

    // Path traversal protection
    const resolved = path.resolve(filePath);
    if (!resolved.startsWith(path.resolve(UPLOAD_DIR))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Check file exists
    try {
      await fs.access(resolved);
    } catch {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const file = await fs.readFile(resolved);
    const ext = path.extname(resolved).toLowerCase();
    const contentType = CONTENT_TYPES[ext] || "application/octet-stream";

    // Security: Serve SVG files as downloads to prevent stored XSS
    // SVGs can contain JavaScript that executes when rendered inline
    const headers: Record<string, string> = {
      "Content-Length": String(file.length),
      "Cache-Control": "public, max-age=31536000, immutable",
    };

    if (ext === ".svg") {
      // Force download for SVG files
      headers["Content-Type"] = "application/octet-stream";
      headers["Content-Disposition"] = `attachment; filename="${path.basename(resolved)}"`;
    } else {
      headers["Content-Type"] = contentType;
    }

    return new NextResponse(file, { headers });
  } catch (error) {
    console.error("[Uploads] Error serving file:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
