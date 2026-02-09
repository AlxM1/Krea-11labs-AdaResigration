/**
 * Environment Variable Validation
 * Validates required environment variables at startup
 */

import { z } from "zod";

const envSchema = z.object({
  // Database (individual vars to avoid URL-encoding issues)
  DB_HOST: z.string().default("localhost"),
  DB_PORT: z.string().default("5432"),
  DB_USER: z.string().default("krya"),
  DB_PASSWORD: z.string().optional(),
  DB_NAME: z.string().default("krya"),

  // Cloud AI Providers (all optional - at least one recommended for production)
  FAL_KEY: z.string().optional(),
  REPLICATE_API_TOKEN: z.string().optional(),
  TOGETHER_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  GOOGLE_AI_API_KEY: z.string().optional(),
  NVIDIA_API_KEY: z.string().optional(),
  HF_TOKEN: z.string().optional(),
  STABILITY_API_KEY: z.string().optional(),

  // Local GPU Server (optional)
  GPU_SERVER_HOST: z.string().optional(),
  GPU_SERVER_PORT: z.string().default("8188"),
  COMFYUI_URL: z.string().optional(),

  // Local LLM (optional)
  OLLAMA_URL: z.string().optional(),
  OLLAMA_MODEL: z.string().default("llama3.1:8b"),

  // Service Integration (optional)
  VOICEFORGE_URL: z.string().optional(),
  WHISPERFLOW_URL: z.string().optional(),
  NEWSLETTER_PIPELINE_URL: z.string().optional(),
  AGENTSMITH_URL: z.string().optional(),
  INTERNAL_API_KEY: z.string().optional(),
  WEBHOOK_SECRET: z.string().optional(),

  // Storage (local filesystem)
  UPLOAD_DIR: z.string().default("/app/uploads"),

  // Payments (optional)
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),

  // Redis (optional but recommended for production)
  REDIS_HOST: z.string().optional(),
  REDIS_PORT: z.string().default("6379"),
  REDIS_PASSWORD: z.string().optional(),
  REDIS_DB: z.string().default("0"),

  // Application
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),

  // Monitoring (optional)
  SENTRY_DSN: z.string().optional(),
  NEXT_PUBLIC_SENTRY_DSN: z.string().optional(),
  NEXT_PUBLIC_POSTHOG_KEY: z.string().optional(),
  NEXT_PUBLIC_POSTHOG_HOST: z.string().optional(),

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
    const hasAnyProvider = !!(
      env.FAL_KEY ||
      env.REPLICATE_API_TOKEN ||
      env.TOGETHER_API_KEY ||
      env.OPENAI_API_KEY ||
      env.GOOGLE_AI_API_KEY ||
      env.NVIDIA_API_KEY ||
      env.HF_TOKEN ||
      env.STABILITY_API_KEY ||
      env.COMFYUI_URL ||
      env.GPU_SERVER_HOST
    );

    if (!hasAnyProvider) {
      console.warn(
        "⚠️  WARNING: No AI provider configured. At least one provider is recommended for production.\n" +
        "   Configure one of: FAL_KEY, REPLICATE_API_TOKEN, TOGETHER_API_KEY, GOOGLE_AI_API_KEY,\n" +
        "   NVIDIA_API_KEY, HF_TOKEN, STABILITY_API_KEY, or COMFYUI_URL/GPU_SERVER_HOST\n" +
        "   The app will function but show setup prompts to users."
      );
    }

    if (!env.REDIS_HOST) {
      console.warn(
        "⚠️  WARNING: REDIS_HOST not configured. Rate limiting will use in-memory storage\n" +
        "   which doesn't work with multiple instances."
      );
    }
  }

  return env;
}

// Validate on import (runs at startup)
export const env = validateEnv();

// Helper to check if a feature is available
export const features = {
  // Core
  hasStorage: true, // Always available (local filesystem)
  hasStripe: !!(env.STRIPE_SECRET_KEY),
  hasRedis: !!(env.REDIS_HOST),

  // Cloud AI Providers
  hasFal: !!(env.FAL_KEY),
  hasReplicate: !!(env.REPLICATE_API_TOKEN),
  hasTogether: !!(env.TOGETHER_API_KEY),
  hasOpenAI: !!(env.OPENAI_API_KEY),
  hasGoogleAI: !!(env.GOOGLE_AI_API_KEY),
  hasNVIDIA: !!(env.NVIDIA_API_KEY),
  hasHuggingFace: !!(env.HF_TOKEN),
  hasStability: !!(env.STABILITY_API_KEY),

  // Local AI
  hasComfyUI: !!(env.COMFYUI_URL || env.GPU_SERVER_HOST),
  hasOllama: !!(env.OLLAMA_URL),

  // Service Integration
  hasVoiceForge: !!(env.VOICEFORGE_URL),
  hasWhisperFlow: !!(env.WHISPERFLOW_URL),
  hasNewsletterPipeline: !!(env.NEWSLETTER_PIPELINE_URL && env.INTERNAL_API_KEY),
  hasAgentSmith: !!(env.AGENTSMITH_URL && env.WEBHOOK_SECRET),

  // Monitoring
  hasSentry: !!(env.SENTRY_DSN),
  hasPostHog: !!(env.NEXT_PUBLIC_POSTHOG_KEY),

  // Check if ANY AI provider is configured
  hasAnyAIProvider: !!(
    env.FAL_KEY ||
    env.REPLICATE_API_TOKEN ||
    env.TOGETHER_API_KEY ||
    env.OPENAI_API_KEY ||
    env.GOOGLE_AI_API_KEY ||
    env.NVIDIA_API_KEY ||
    env.HF_TOKEN ||
    env.STABILITY_API_KEY ||
    env.COMFYUI_URL ||
    env.GPU_SERVER_HOST
  ),
};
