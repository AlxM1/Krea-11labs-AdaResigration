/**
 * Sentry Server Configuration
 * This file configures the initialization of Sentry on the server.
 */

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,

  // Only enable in production
  enabled: process.env.NODE_ENV === "production",

  // Performance Monitoring
  tracesSampleRate: 0.1, // 10% of transactions

  // Debug mode in development
  debug: process.env.NODE_ENV === "development",

  // Set the environment
  environment: process.env.NODE_ENV,

  // Filter out common non-issues
  ignoreErrors: [
    // Prisma connection issues (temporary)
    "PrismaClientInitializationError",
    // Rate limiting (expected behavior)
    "Too many requests",
    // User cancelled
    "AbortError",
  ],

  // Filter transactions
  beforeSendTransaction(event) {
    // Filter out health checks and static assets
    if (
      event.transaction?.includes("/api/health") ||
      event.transaction?.includes("/_next/")
    ) {
      return null;
    }
    return event;
  },

  // Add custom context
  beforeSend(event, hint) {
    // Add additional context for debugging
    const error = hint.originalException;

    if (error instanceof Error) {
      // Add error details
      event.extra = {
        ...event.extra,
        errorName: error.name,
        errorMessage: error.message,
      };
    }

    return event;
  },

  // Integrations
  integrations: [
    // Capture unhandled promise rejections
    Sentry.captureConsoleIntegration({
      levels: ["error"],
    }),
  ],
});
