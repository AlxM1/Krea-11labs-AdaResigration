import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";
import path from "path";

const nextConfig: NextConfig = {
  // Trace from monorepo root so standalone includes root node_modules
  outputFileTracingRoot: path.join(__dirname, "../../"),
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.r2.cloudflarestorage.com",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com",
      },
      {
        protocol: "https",
        hostname: "*.fal.media",
      },
      {
        protocol: "https",
        hostname: "*.replicate.delivery",
      },
      {
        protocol: "https",
        hostname: "api.dicebear.com",
      },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
  // Ensure native Node.js packages are not bundled (required for standalone)
  serverExternalPackages: ["socket.io", "bullmq", "ioredis", "pg", "@prisma/client", "pino", "pino-pretty", "sharp"],
  // Output standalone build for Docker
  output: "standalone",
};

// Sentry configuration
const sentryConfig = {
  // Suppress source map upload warnings
  silent: true,

  // Organization and project (set via env vars)
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,

  // Upload source maps only in production
  widenClientFileUpload: true,

  // Transpile SDK to be compatible with IE11
  transpileClientSDK: true,

  // Route browser requests to Sentry through a Next.js rewrite
  tunnelRoute: "/monitoring",

  // Hide source maps from generated client bundles
  hideSourceMaps: true,

  // Disable logger in production
  disableLogger: true,

  // Automatically tree-shake Sentry logger statements
  automaticVercelMonitors: true,
};

// Only wrap with Sentry if DSN is configured
const config = process.env.SENTRY_DSN
  ? withSentryConfig(nextConfig, sentryConfig)
  : nextConfig;

export default config;
