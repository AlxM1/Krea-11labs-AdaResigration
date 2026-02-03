/**
 * Structured Logging with Pino
 * Provides consistent, JSON-formatted logging with request context
 */

import pino from "pino";
import { randomUUID } from "crypto";
import { NextRequest } from "next/server";

// Configure pino based on environment
const isDev = process.env.NODE_ENV === "development";

// Create the base logger
export const logger = pino({
  level: process.env.LOG_LEVEL || (isDev ? "debug" : "info"),
  formatters: {
    level: (label) => ({ level: label }),
    bindings: () => ({}), // Remove default bindings (pid, hostname)
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  // Pretty print in development
  ...(isDev
    ? {
        transport: {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "HH:MM:ss.l",
            ignore: "pid,hostname",
          },
        },
      }
    : {}),
});

/**
 * Request context for logging
 */
export interface RequestContext {
  requestId: string;
  method: string;
  path: string;
  userId?: string;
  ip?: string;
  userAgent?: string;
}

/**
 * Create a child logger with request context
 */
export function createRequestLogger(ctx: RequestContext) {
  return logger.child({
    requestId: ctx.requestId,
    method: ctx.method,
    path: ctx.path,
    userId: ctx.userId,
    ip: ctx.ip,
  });
}

/**
 * Extract request context from NextRequest
 */
export function getRequestContext(
  req: NextRequest,
  userId?: string
): RequestContext {
  const forwarded = req.headers.get("x-forwarded-for");
  const ip = forwarded ? forwarded.split(",")[0].trim() : "unknown";

  return {
    requestId: req.headers.get("x-request-id") || randomUUID(),
    method: req.method,
    path: new URL(req.url).pathname,
    userId,
    ip,
    userAgent: req.headers.get("user-agent") || undefined,
  };
}

/**
 * Generate a unique request ID
 */
export function generateRequestId(): string {
  return randomUUID();
}

/**
 * API Logger - convenience wrapper for API routes
 */
export function apiLogger(req: NextRequest, userId?: string) {
  const ctx = getRequestContext(req, userId);
  const log = createRequestLogger(ctx);

  return {
    ctx,
    log,
    info: (msg: string, data?: object) => log.info(data, msg),
    warn: (msg: string, data?: object) => log.warn(data, msg),
    error: (msg: string, error?: Error | object) => {
      if (error instanceof Error) {
        log.error({ err: error, stack: error.stack }, msg);
      } else {
        log.error(error, msg);
      }
    },
    debug: (msg: string, data?: object) => log.debug(data, msg),
    // Log request start/end for timing
    startRequest: () => {
      log.info({ type: "request_start" }, `${ctx.method} ${ctx.path}`);
      return Date.now();
    },
    endRequest: (startTime: number, statusCode: number) => {
      const duration = Date.now() - startTime;
      log.info(
        { type: "request_end", statusCode, durationMs: duration },
        `${ctx.method} ${ctx.path} ${statusCode} ${duration}ms`
      );
    },
  };
}

/**
 * Specialized loggers for different parts of the application
 */
export const loggers = {
  db: logger.child({ module: "database" }),
  auth: logger.child({ module: "auth" }),
  ai: logger.child({ module: "ai" }),
  queue: logger.child({ module: "queue" }),
  storage: logger.child({ module: "storage" }),
  stripe: logger.child({ module: "stripe" }),
};

/**
 * Log levels
 */
export const LogLevel = {
  FATAL: "fatal",
  ERROR: "error",
  WARN: "warn",
  INFO: "info",
  DEBUG: "debug",
  TRACE: "trace",
} as const;

export type LogLevel = (typeof LogLevel)[keyof typeof LogLevel];

export default logger;
