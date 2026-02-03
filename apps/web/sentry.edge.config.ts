/**
 * Sentry Edge Configuration
 * This file configures Sentry for Edge runtime (middleware, edge API routes).
 */

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,

  // Only enable in production
  enabled: process.env.NODE_ENV === "production",

  // Performance Monitoring
  tracesSampleRate: 0.1,

  // Debug mode in development
  debug: process.env.NODE_ENV === "development",
});
