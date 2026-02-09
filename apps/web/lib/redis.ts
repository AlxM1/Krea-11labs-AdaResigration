/**
 * Redis Client
 * Used for rate limiting, caching, and job queues
 */

import Redis from "ioredis";

// Singleton Redis instance
let redis: Redis | null = null;

/**
 * Get Redis client instance
 * Returns null if REDIS_HOST is not configured
 */
export function getRedis(): Redis | null {
  if (!process.env.REDIS_HOST) {
    return null;
  }

  if (!redis) {
    redis = new Redis({
      host: process.env.REDIS_HOST,
      port: parseInt(process.env.REDIS_PORT || "6379"),
      password: process.env.REDIS_PASSWORD || undefined,
      db: parseInt(process.env.REDIS_DB || "0"),
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      enableReadyCheck: true,
      lazyConnect: true,
    });

    redis.on("error", (error) => {
      console.error("[Redis] Connection error:", error.message);
    });

    redis.on("connect", () => {
      console.log("[Redis] Connected successfully");
    });

    redis.on("ready", () => {
      console.log("[Redis] Ready to accept commands");
    });

    // Connect immediately
    redis.connect().catch((error) => {
      console.error("[Redis] Failed to connect:", error.message);
    });
  }

  return redis;
}

/**
 * Get Redis connection options (for BullMQ which creates its own connections)
 */
export function getRedisConnectionOptions() {
  if (!process.env.REDIS_HOST) {
    return null;
  }
  return {
    host: process.env.REDIS_HOST,
    port: parseInt(process.env.REDIS_PORT || "6379"),
    password: process.env.REDIS_PASSWORD || undefined,
    db: parseInt(process.env.REDIS_DB || "0"),
    maxRetriesPerRequest: null as null,
  };
}

/**
 * Check if Redis is available and connected
 */
export async function isRedisAvailable(): Promise<boolean> {
  const client = getRedis();
  if (!client) return false;

  try {
    await client.ping();
    return true;
  } catch {
    return false;
  }
}

/**
 * Gracefully close Redis connection
 */
export async function closeRedis(): Promise<void> {
  if (redis) {
    await redis.quit();
    redis = null;
  }
}

/**
 * Cache helper functions
 */
export const cache = {
  /**
   * Get cached value
   */
  async get<T>(key: string): Promise<T | null> {
    const client = getRedis();
    if (!client) return null;

    try {
      const value = await client.get(key);
      return value ? JSON.parse(value) : null;
    } catch {
      return null;
    }
  },

  /**
   * Set cached value with optional TTL (in seconds)
   */
  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<boolean> {
    const client = getRedis();
    if (!client) return false;

    try {
      const serialized = JSON.stringify(value);
      if (ttlSeconds) {
        await client.setex(key, ttlSeconds, serialized);
      } else {
        await client.set(key, serialized);
      }
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Delete cached value
   */
  async del(key: string): Promise<boolean> {
    const client = getRedis();
    if (!client) return false;

    try {
      await client.del(key);
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Check if key exists
   */
  async exists(key: string): Promise<boolean> {
    const client = getRedis();
    if (!client) return false;

    try {
      const result = await client.exists(key);
      return result === 1;
    } catch {
      return false;
    }
  },
};
