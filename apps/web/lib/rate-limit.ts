/**
 * Rate Limiting Module
 * Supports both Redis (for production) and in-memory (for development/single instance)
 */

import { NextRequest, NextResponse } from "next/server";
import { getRedis } from "./redis";

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

// In-memory fallback store
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

// Clean up expired entries periodically (in-memory only)
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, value] of Array.from(rateLimitStore.entries())) {
      if (value.resetAt < now) {
        rateLimitStore.delete(key);
      }
    }
  }, 60000);
}

/**
 * Rate limit using Redis (distributed, production-ready)
 */
async function rateLimitRedis(
  identifier: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const redis = getRedis();
  if (!redis) {
    return rateLimitMemory(identifier, config);
  }

  const key = `ratelimit:${identifier}`;
  const ttlSeconds = Math.ceil(config.interval / 1000);

  try {
    // Use Redis transaction for atomic operations
    const multi = redis.multi();
    multi.incr(key);
    multi.ttl(key);
    const results = await multi.exec();

    if (!results) {
      return rateLimitMemory(identifier, config);
    }

    const count = results[0][1] as number;
    let ttl = results[1][1] as number;

    // Set expiry if this is the first request in the window
    if (ttl === -1) {
      await redis.expire(key, ttlSeconds);
      ttl = ttlSeconds;
    }

    return {
      success: count <= config.maxRequests,
      limit: config.maxRequests,
      remaining: Math.max(0, config.maxRequests - count),
      reset: Date.now() + ttl * 1000,
    };
  } catch (error) {
    console.error("[RateLimit] Redis error, falling back to memory:", error);
    return rateLimitMemory(identifier, config);
  }
}

/**
 * Rate limit using in-memory store (single instance only)
 */
function rateLimitMemory(
  identifier: string,
  config: RateLimitConfig
): RateLimitResult {
  const now = Date.now();
  const key = identifier;
  const current = rateLimitStore.get(key);

  if (!current || current.resetAt < now) {
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

/**
 * Main rate limit function - uses Redis if available, falls back to memory
 */
export async function rateLimit(
  identifier: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const redis = getRedis();
  if (redis) {
    return rateLimitRedis(identifier, config);
  }

  // Log warning in production without Redis
  if (process.env.NODE_ENV === "production") {
    console.warn(
      "[RateLimit] Using in-memory rate limiting. Set REDIS_HOST for distributed rate limiting."
    );
  }

  return rateLimitMemory(identifier, config);
}

/**
 * Synchronous rate limit (memory only) - for use in sync contexts
 */
export function rateLimitSync(
  identifier: string,
  config: RateLimitConfig
): RateLimitResult {
  return rateLimitMemory(identifier, config);
}

// Rate limit configurations for different endpoints
export const rateLimitConfigs = {
  auth: {
    interval: 60 * 1000, // 1 minute
    maxRequests: 10,
  },
  generation: {
    interval: 60 * 1000,
    maxRequests: 30,
  },
  enhance: {
    interval: 60 * 1000,
    maxRequests: 20,
  },
  training: {
    interval: 60 * 60 * 1000, // 1 hour
    maxRequests: 5,
  },
  api: {
    interval: 60 * 1000,
    maxRequests: 100,
  },
  expensive: {
    interval: 60 * 1000,
    maxRequests: 5,
  },
};

// Tier-based rate limits
export const tierRateLimits: Record<string, RateLimitConfig> = {
  FREE: { interval: 60 * 1000, maxRequests: 10 },
  BASIC: { interval: 60 * 1000, maxRequests: 30 },
  PRO: { interval: 60 * 1000, maxRequests: 60 },
  MAX: { interval: 60 * 1000, maxRequests: 120 },
  TEAM: { interval: 60 * 1000, maxRequests: 200 },
  ENTERPRISE: { interval: 60 * 1000, maxRequests: 500 },
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

  const forwarded = req.headers.get("x-forwarded-for");
  const ip = forwarded ? forwarded.split(",")[0].trim() : "unknown";
  return `ip:${ip}`;
}
