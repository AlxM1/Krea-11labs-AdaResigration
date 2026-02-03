/**
 * Sentry Client Configuration
 * This file configures the initialization of Sentry on the client.
 */

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Only enable in production
  enabled: process.env.NODE_ENV === "production",

  // Performance Monitoring
  tracesSampleRate: 0.1, // 10% of transactions

  // Session Replay (optional)
  replaysSessionSampleRate: 0.1, // 10% of sessions
  replaysOnErrorSampleRate: 1.0, // 100% of sessions with errors

  // Debug mode in development
  debug: process.env.NODE_ENV === "development",

  // Filter out common non-issues
  ignoreErrors: [
    // Browser extensions
    "top.GLOBALS",
    // Random plugins/extensions
    "originalCreateNotification",
    "canvas.contentDocument",
    "MyApp_RemoveAllHighlights",
    "http://tt.teletracker.com",
    "http://tt.epicplay.com",
    // Facebook bugs
    "Can't find variable: ZiteReader",
    // iOS Safari
    "The operation couldn't be completed. Software caused connection abort",
    // Chrome extensions
    "chrome-extension://",
    "moz-extension://",
    // Network errors
    "Failed to fetch",
    "Load failed",
    "NetworkError",
    "ChunkLoadError",
    // User cancelled navigation
    "AbortError",
  ],

  // Filter transactions
  beforeSendTransaction(event) {
    // Filter out health checks
    if (event.transaction?.includes("/api/health")) {
      return null;
    }
    return event;
  },

  // Add custom context
  beforeSend(event, hint) {
    // Filter out certain errors
    const error = hint.originalException;
    if (error instanceof Error) {
      // Ignore user-initiated aborts
      if (error.name === "AbortError") {
        return null;
      }
    }
    return event;
  },
});
