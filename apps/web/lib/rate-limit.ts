/**
 * Rate Limiting Module
 *
 * PRODUCTION NOTE: This implementation uses in-memory storage which:
 * - Does NOT work with multiple server instances (no shared state)
 * - Resets on server restart
 * - Is fine for single-instance deployments or development
 *
 * For production with multiple instances, replace with Redis:
 * 1. Add ioredis: npm install ioredis
 * 2. Replace rateLimitStore with Redis calls
 * 3. Use INCR with EXPIRE for atomic rate limiting
 *
 * Example Redis implementation:
 * ```
 * import Redis from 'ioredis';
 * const redis = new Redis(process.env.REDIS_URL);
 *
 * async function rateLimit(identifier: string, config: RateLimitConfig) {
 *   const key = `ratelimit:${identifier}`;
 *   const count = await redis.incr(key);
 *   if (count === 1) {
 *     await redis.expire(key, Math.ceil(config.interval / 1000));
 *   }
 *   const ttl = await redis.ttl(key);
 *   return {
 *     success: count <= config.maxRequests,
 *     limit: config.maxRequests,
 *     remaining: Math.max(0, config.maxRequests - count),
 *     reset: Date.now() + ttl * 1000,
 *   };
 * }
 * ```
 */

import { NextRequest, NextResponse } from "next/server";

interface RateLimitConfig {
  interval: number; // Time window in milliseconds
  maxRequests: number; // Max requests per interval
}

interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

// Warn about in-memory rate limiting in production
if (process.env.NODE_ENV === "production" && !process.env.REDIS_URL) {
  console.warn(
    "[RATE LIMIT] Using in-memory rate limiting. This does not work with multiple server instances. " +
    "Set REDIS_URL for production deployments with load balancing."
  );
}

// In-memory store for rate limiting
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

// Clean up expired entries periodically
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, value] of rateLimitStore.entries()) {
      if (value.resetAt < now) {
        rateLimitStore.delete(key);
      }
    }
  }, 60000); // Clean up every minute
}

export function rateLimit(
  identifier: string,
  config: RateLimitConfig
): RateLimitResult {
  const now = Date.now();
  const key = identifier;

  const current = rateLimitStore.get(key);

  if (!current || current.resetAt < now) {
    // Start new window
    rateLimitStore.set(key, {
      count: 1,
      resetAt: now + config.interval,
    });

    return {
      success: true,
      limit: config.maxRequests,
      remaining: config.maxRequests - 1,
      reset: now + config.interval,
    };
  }

  if (current.count >= config.maxRequests) {
    return {
      success: false,
      limit: config.maxRequests,
      remaining: 0,
      reset: current.resetAt,
    };
  }

  current.count++;
  rateLimitStore.set(key, current);

  return {
    success: true,
    limit: config.maxRequests,
    remaining: config.maxRequests - current.count,
    reset: current.resetAt,
  };
}

// Rate limit configurations for different endpoints
export const rateLimitConfigs = {
  // Auth endpoints
  auth: {
    interval: 60 * 1000, // 1 minute
    maxRequests: 10,
  },

  // Generation endpoints (per user)
  generation: {
    interval: 60 * 1000, // 1 minute
    maxRequests: 30,
  },

  // Enhancement endpoints
  enhance: {
    interval: 60 * 1000,
    maxRequests: 20,
  },

  // Training endpoints
  training: {
    interval: 60 * 60 * 1000, // 1 hour
    maxRequests: 5,
  },

  // General API endpoints
  api: {
    interval: 60 * 1000,
    maxRequests: 100,
  },

  // Strict rate limit for expensive operations
  expensive: {
    interval: 60 * 1000,
    maxRequests: 5,
  },
};

// Tier-based rate limits
export const tierRateLimits: Record<string, RateLimitConfig> = {
  FREE: {
    interval: 60 * 1000,
    maxRequests: 10,
  },
  BASIC: {
    interval: 60 * 1000,
    maxRequests: 30,
  },
  PRO: {
    interval: 60 * 1000,
    maxRequests: 60,
  },
  MAX: {
    interval: 60 * 1000,
    maxRequests: 120,
  },
  TEAM: {
    interval: 60 * 1000,
    maxRequests: 200,
  },
  ENTERPRISE: {
    interval: 60 * 1000,
    maxRequests: 500,
  },
};

export function getRateLimitForTier(tier: string): RateLimitConfig {
  return tierRateLimits[tier] || tierRateLimits.FREE;
}

// Helper to create rate limit response
export function rateLimitResponse(result: RateLimitResult): NextResponse {
  return NextResponse.json(
    {
      error: "Too many requests",
      retryAfter: Math.ceil((result.reset - Date.now()) / 1000),
    },
    {
      status: 429,
      headers: {
        "X-RateLimit-Limit": result.limit.toString(),
        "X-RateLimit-Remaining": result.remaining.toString(),
        "X-RateLimit-Reset": result.reset.toString(),
        "Retry-After": Math.ceil((result.reset - Date.now()) / 1000).toString(),
      },
    }
  );
}

// Add rate limit headers to successful responses
export function addRateLimitHeaders(
  response: NextResponse,
  result: RateLimitResult
): NextResponse {
  response.headers.set("X-RateLimit-Limit", result.limit.toString());
  response.headers.set("X-RateLimit-Remaining", result.remaining.toString());
  response.headers.set("X-RateLimit-Reset", result.reset.toString());
  return response;
}

// Get client identifier for rate limiting
export function getClientIdentifier(req: NextRequest, userId?: string): string {
  if (userId) {
    return `user:${userId}`;
  }

  // Fall back to IP address
  const forwarded = req.headers.get("x-forwarded-for");
  const ip = forwarded ? forwarded.split(",")[0].trim() : "unknown";
  return `ip:${ip}`;
}
