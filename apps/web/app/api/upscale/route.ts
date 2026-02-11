import { NextRequest } from "next/server";

/**
 * Upscale API - redirects to enhance endpoint
 * Exists for API compatibility
 */
export async function POST(req: NextRequest) {
  const enhanceUrl = new URL("/api/enhance", req.url);
  return fetch(enhanceUrl.toString(), {
    method: "POST",
    headers: req.headers,
    body: await req.text(),
  });
}
