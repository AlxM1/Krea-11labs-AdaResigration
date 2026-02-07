import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// For personal use: All routes are public, no authentication required

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip middleware for static files and Next.js internals
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/static") ||
    pathname.includes(".") // Skip files with extensions
  ) {
    return NextResponse.next();
  }

  // Redirect login/register/pricing pages to dashboard (not needed for personal use)
  if (pathname === "/login" || pathname === "/register" || pathname === "/pricing") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Add security headers to all responses
  const response = NextResponse.next();
  const isProduction = process.env.NODE_ENV === "production";

  // Basic security headers
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()"
  );
  response.headers.set("X-XSS-Protection", "1; mode=block");

  // HSTS - Strict Transport Security (only in production with HTTPS)
  if (isProduction) {
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains; preload"
    );
  }

  // Content Security Policy
  const cspDirectives = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https://*.fal.media https://*.replicate.delivery https://*.dicebear.com https://*.blob.core.windows.net",
    "font-src 'self' data:",
    "connect-src 'self' https://*.fal.ai https://*.replicate.com wss://*",
    "media-src 'self' blob: https://*.fal.media https://*.replicate.delivery",
    "frame-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "upgrade-insecure-requests",
  ];

  // Relaxed CSP in development for hot reload
  if (!isProduction) {
    cspDirectives[1] = "script-src 'self' 'unsafe-inline' 'unsafe-eval'";
    cspDirectives.push("connect-src 'self' ws://localhost:* http://localhost:* https://*.fal.ai https://*.replicate.com wss://*");
  }

  response.headers.set("Content-Security-Policy", cspDirectives.join("; "));

  // Add CORS headers for API routes
  if (pathname.startsWith("/api")) {
    const origin = request.headers.get("origin");
    if (origin) {
      response.headers.set("Access-Control-Allow-Origin", origin);
    }

    response.headers.set(
      "Access-Control-Allow-Methods",
      "GET, POST, PUT, PATCH, DELETE, OPTIONS"
    );
    response.headers.set(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization"
    );
    response.headers.set("Access-Control-Allow-Credentials", "true");
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
