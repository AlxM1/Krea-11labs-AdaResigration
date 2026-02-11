import { NextRequest } from "next/server";

/**
 * AI Effects API - redirects to style-transfer endpoint
 * Exists for API compatibility
 */
export async function POST(req: NextRequest) {
  const styleTransferUrl = new URL("/api/generate/style-transfer", req.url);
  return fetch(styleTransferUrl.toString(), {
    method: "POST",
    headers: req.headers,
    body: await req.text(),
  });
}
