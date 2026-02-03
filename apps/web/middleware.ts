import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

// Routes that require authentication
const protectedRoutes = [
  "/dashboard",
  "/image",
  "/video",
  "/realtime",
  "/enhancer",
  "/editor",
  "/3d",
  "/train",
  "/lipsync",
  "/motion-transfer",
  "/video-restyle",
  "/settings",
  "/profile",
  "/history",
  "/favorites",
  "/projects",
  "/nodes",
  "/feed",
];

// API routes that require authentication
const protectedApiRoutes = [
  "/api/generate",
  "/api/enhance",
  "/api/train",
  "/api/workflows",
  "/api/user",
  "/api/upload",
];

// Public routes that don't require authentication
const publicRoutes = ["/", "/login", "/register", "/pricing", "/api/auth"];

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

  // Check if this is a protected page route
  const isProtectedPage = protectedRoutes.some((route) =>
    pathname.startsWith(route)
  );

  // Check if this is a protected API route
  const isProtectedApi = protectedApiRoutes.some((route) =>
    pathname.startsWith(route)
  );

  // Get the user's session token
  const token = await getToken({
    req: request,
    secret: process.env.AUTH_SECRET,
  });

  // Handle protected page routes
  if (isProtectedPage && !token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Handle protected API routes
  if (isProtectedApi && !token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Redirect logged-in users away from auth pages
  if (token && (pathname === "/login" || pathname === "/register")) {
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
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // unsafe-eval needed for Next.js dev
    "style-src 'self' 'unsafe-inline'", // unsafe-inline needed for Tailwind
    "img-src 'self' data: blob: https://*.fal.media https://*.replicate.delivery https://*.dicebear.com https://*.blob.core.windows.net",
    "font-src 'self' data:",
    "connect-src 'self' https://*.fal.ai https://*.replicate.com https://api.stripe.com wss://*",
    "media-src 'self' blob: https://*.fal.media https://*.replicate.delivery",
    "frame-src 'self' https://js.stripe.com",
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
    // Secure CORS: Only allow configured origins
    const allowedOrigins = isProduction
      ? [process.env.NEXT_PUBLIC_APP_URL, process.env.NEXTAUTH_URL].filter(Boolean) as string[]
      : [
          process.env.NEXT_PUBLIC_APP_URL,
          process.env.NEXTAUTH_URL,
          "http://localhost:3000",
          "http://localhost:3001",
        ].filter(Boolean) as string[];

    const origin = request.headers.get("origin");
    if (origin && allowedOrigins.includes(origin)) {
      response.headers.set("Access-Control-Allow-Origin", origin);
    } else if (!isProduction && origin) {
      // Only allow any origin in development mode
      response.headers.set("Access-Control-Allow-Origin", origin);
    }
    // In production with no matching origin, don't set the header (blocks CORS)

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
