import { NextRequest } from "next/server";

/**
 * Remove Background API - redirects to background-removal endpoint
 * Exists for API compatibility
 */
export async function POST(req: NextRequest) {
  const bgRemovalUrl = new URL("/api/generate/background-removal", req.url);
  return fetch(bgRemovalUrl.toString(), {
    method: "POST",
    headers: req.headers,
    body: await req.text(),
  });
}
