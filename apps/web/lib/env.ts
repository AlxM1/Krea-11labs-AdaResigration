/**
 * Environment Variable Validation
 * Validates required environment variables at startup
 */

import { z } from "zod";

const envSchema = z.object({
  // Database (required)
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),

  // Authentication (required)
  AUTH_SECRET: z.string().min(32, "AUTH_SECRET must be at least 32 characters"),
  NEXTAUTH_URL: z.string().url().optional(),

  // OAuth providers (optional but validated if present)
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GITHUB_CLIENT_ID: z.string().optional(),
  GITHUB_CLIENT_SECRET: z.string().optional(),

  // AI Providers (at least one required in production)
  FAL_KEY: z.string().optional(),
  REPLICATE_API_TOKEN: z.string().optional(),
  TOGETHER_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),

  // Storage (optional - falls back to provider URLs)
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  AWS_REGION: z.string().default("us-east-1"),
  S3_BUCKET: z.string().optional(),
  CLOUDFLARE_ACCOUNT_ID: z.string().optional(),
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_BUCKET_NAME: z.string().optional(),
  R2_PUBLIC_URL: z.string().optional(),

  // Payments (optional)
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),

  // Redis (optional but recommended for production)
  REDIS_URL: z.string().optional(),

  // Application
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),

  // Admin
  ADMIN_EMAILS: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

function validateEnv(): Env {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    console.error("Environment validation failed:");
    console.error(parsed.error.flatten().fieldErrors);
    throw new Error(
      `Invalid environment variables: ${Object.keys(parsed.error.flatten().fieldErrors).join(", ")}`
    );
  }

  const env = parsed.data;

  // Production-specific validations
  if (env.NODE_ENV === "production") {
    // At least one AI provider must be configured
    if (!env.FAL_KEY && !env.REPLICATE_API_TOKEN && !env.TOGETHER_API_KEY && !env.OPENAI_API_KEY) {
      console.warn(
        "WARNING: No AI provider configured. At least one of FAL_KEY, REPLICATE_API_TOKEN, TOGETHER_API_KEY, or OPENAI_API_KEY is recommended."
      );
    }

    // Redis recommended for production
    if (!env.REDIS_URL) {
      console.warn(
        "WARNING: REDIS_URL not configured. Rate limiting will use in-memory storage which doesn't work with multiple instances."
      );
    }

    // Storage recommended for production
    const hasS3 = env.AWS_ACCESS_KEY_ID && env.AWS_SECRET_ACCESS_KEY && env.S3_BUCKET;
    const hasR2 = env.R2_ACCESS_KEY_ID && env.R2_SECRET_ACCESS_KEY && env.R2_BUCKET_NAME;
    if (!hasS3 && !hasR2) {
      console.warn(
        "WARNING: No storage provider configured. Generated images will use provider URLs directly."
      );
    }
  }

  return env;
}

// Validate on import (runs at startup)
export const env = validateEnv();

// Helper to check if a feature is available
export const features = {
  hasStorage: !!(
    (env.AWS_ACCESS_KEY_ID && env.AWS_SECRET_ACCESS_KEY && env.S3_BUCKET) ||
    (env.R2_ACCESS_KEY_ID && env.R2_SECRET_ACCESS_KEY && env.R2_BUCKET_NAME)
  ),
  hasStripe: !!(env.STRIPE_SECRET_KEY),
  hasRedis: !!(env.REDIS_URL),
  hasFal: !!(env.FAL_KEY),
  hasReplicate: !!(env.REPLICATE_API_TOKEN),
  hasTogether: !!(env.TOGETHER_API_KEY),
  hasOpenAI: !!(env.OPENAI_API_KEY),
  hasGoogleAuth: !!(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET),
  hasGitHubAuth: !!(env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET),
};
