/**
 * Provider Chain Orchestrator
 * Implements multi-provider fallback with graceful degradation
 */

import { GenerationRequest, GenerationResponse, VideoGenerationRequest, VideoGenerationResponse, AIProvider } from "./providers";

export interface ProviderConfig {
  name: AIProvider;
  priority: number;
  isAvailable: () => Promise<boolean>;
}

export interface ProviderChainConfig {
  feature: 'text-to-image' | 'image-to-image' | 'video' | 'upscale' | 'inpaint' | 'background-removal' | 'style-transfer' | '3d' | 'logo' | 'realtime-canvas' | 'training';
  providers: ProviderConfig[];
}

export interface ProviderAttemptResult {
  provider: AIProvider;
  success: boolean;
  result?: GenerationResponse | VideoGenerationResponse;
  error?: string;
  duration?: number;
}

export interface ChainExecutionResult {
  success: boolean;
  result?: GenerationResponse | VideoGenerationResponse;
  attempts: ProviderAttemptResult[];
  finalError?: string;
}

/**
 * Provider availability checks
 */
export async function checkProviderAvailability(provider: AIProvider): Promise<boolean> {
  switch (provider) {
    case 'fal':
      return !!process.env.FAL_KEY;

    case 'replicate':
      return !!process.env.REPLICATE_API_TOKEN;

    case 'together':
      return !!process.env.TOGETHER_API_KEY;

    case 'openai':
      return !!process.env.OPENAI_API_KEY;

    case 'google':
      return !!process.env.GOOGLE_AI_API_KEY;

    case 'comfyui':
      if (!process.env.COMFYUI_URL && !process.env.GPU_SERVER_HOST) {
        return false;
      }
      try {
        const comfyUrl = process.env.COMFYUI_URL || `http://${process.env.GPU_SERVER_HOST}:${process.env.GPU_SERVER_PORT || 8188}`;
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);

        const response = await fetch(`${comfyUrl}/system_stats`, {
          signal: controller.signal,
        });

        clearTimeout(timeout);
        return response.ok;
      } catch {
        return false;
      }

    case 'ollama':
      if (!process.env.OLLAMA_URL) {
        return false;
      }
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);

        const response = await fetch(`${process.env.OLLAMA_URL}/api/tags`, {
          signal: controller.signal,
        });

        clearTimeout(timeout);
        return response.ok;
      } catch {
        return false;
      }

    default:
      return false;
  }
}

/**
 * Provider chains by feature
 */
export const providerChains: Record<string, ProviderChainConfig> = {
  'text-to-image': {
    feature: 'text-to-image',
    providers: [
      { name: 'fal', priority: 1, isAvailable: () => checkProviderAvailability('fal') },
      { name: 'together', priority: 2, isAvailable: () => checkProviderAvailability('together') },
      { name: 'replicate', priority: 3, isAvailable: () => checkProviderAvailability('replicate') },
      { name: 'comfyui', priority: 4, isAvailable: () => checkProviderAvailability('comfyui') },
      { name: 'google', priority: 5, isAvailable: () => checkProviderAvailability('google') },
    ],
  },
  'image-to-image': {
    feature: 'image-to-image',
    providers: [
      { name: 'fal', priority: 1, isAvailable: () => checkProviderAvailability('fal') },
      { name: 'replicate', priority: 2, isAvailable: () => checkProviderAvailability('replicate') },
      { name: 'comfyui', priority: 3, isAvailable: () => checkProviderAvailability('comfyui') },
    ],
  },
  'video': {
    feature: 'video',
    providers: [
      { name: 'fal', priority: 1, isAvailable: () => checkProviderAvailability('fal') },
      { name: 'replicate', priority: 2, isAvailable: () => checkProviderAvailability('replicate') },
      { name: 'google', priority: 3, isAvailable: () => checkProviderAvailability('google') },
    ],
  },
  'upscale': {
    feature: 'upscale',
    providers: [
      { name: 'fal', priority: 1, isAvailable: () => checkProviderAvailability('fal') },
      { name: 'replicate', priority: 2, isAvailable: () => checkProviderAvailability('replicate') },
      { name: 'comfyui', priority: 3, isAvailable: () => checkProviderAvailability('comfyui') },
    ],
  },
  'inpaint': {
    feature: 'inpaint',
    providers: [
      { name: 'fal', priority: 1, isAvailable: () => checkProviderAvailability('fal') },
      { name: 'replicate', priority: 2, isAvailable: () => checkProviderAvailability('replicate') },
      { name: 'comfyui', priority: 3, isAvailable: () => checkProviderAvailability('comfyui') },
    ],
  },
  'background-removal': {
    feature: 'background-removal',
    providers: [
      { name: 'fal', priority: 1, isAvailable: () => checkProviderAvailability('fal') },
      { name: 'replicate', priority: 2, isAvailable: () => checkProviderAvailability('replicate') },
    ],
  },
  'style-transfer': {
    feature: 'style-transfer',
    providers: [
      { name: 'fal', priority: 1, isAvailable: () => checkProviderAvailability('fal') },
      { name: 'replicate', priority: 2, isAvailable: () => checkProviderAvailability('replicate') },
      { name: 'comfyui', priority: 3, isAvailable: () => checkProviderAvailability('comfyui') },
    ],
  },
  '3d': {
    feature: '3d',
    providers: [
      { name: 'fal', priority: 1, isAvailable: () => checkProviderAvailability('fal') },
      { name: 'replicate', priority: 2, isAvailable: () => checkProviderAvailability('replicate') },
    ],
  },
  'logo': {
    feature: 'logo',
    providers: [
      { name: 'fal', priority: 1, isAvailable: () => checkProviderAvailability('fal') },
      { name: 'together', priority: 2, isAvailable: () => checkProviderAvailability('together') },
      { name: 'replicate', priority: 3, isAvailable: () => checkProviderAvailability('replicate') },
    ],
  },
  'realtime-canvas': {
    feature: 'realtime-canvas',
    providers: [
      { name: 'fal', priority: 1, isAvailable: () => checkProviderAvailability('fal') },
      { name: 'comfyui', priority: 2, isAvailable: () => checkProviderAvailability('comfyui') },
    ],
  },
  'training': {
    feature: 'training',
    providers: [
      { name: 'replicate', priority: 1, isAvailable: () => checkProviderAvailability('replicate') },
    ],
  },
};

/**
 * Retry configuration
 */
const RETRY_CONFIG = {
  maxAttempts: 3,
  initialDelayMs: 1000,
  maxDelayMs: 10000,
  backoffMultiplier: 2,
};

/**
 * Exponential backoff delay
 */
function getRetryDelay(attemptNumber: number): number {
  const delay = RETRY_CONFIG.initialDelayMs * Math.pow(RETRY_CONFIG.backoffMultiplier, attemptNumber - 1);
  return Math.min(delay, RETRY_CONFIG.maxDelayMs);
}

/**
 * Execute generation with retry logic
 */
async function executeWithRetry<T>(
  fn: () => Promise<T>,
  maxAttempts: number = RETRY_CONFIG.maxAttempts
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt < maxAttempts) {
        const delay = getRetryDelay(attempt);
        console.log(`Attempt ${attempt} failed, retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError || new Error('All retry attempts failed');
}

/**
 * Execute provider chain for image generation
 */
export async function executeImageChain(
  feature: string,
  request: GenerationRequest,
  generateFn: (provider: AIProvider, request: GenerationRequest) => Promise<GenerationResponse>
): Promise<ChainExecutionResult> {
  const chain = providerChains[feature];

  if (!chain) {
    return {
      success: false,
      attempts: [],
      finalError: `Unknown feature: ${feature}`,
    };
  }

  const attempts: ProviderAttemptResult[] = [];

  // Filter to only available providers
  const availableProviders: ProviderConfig[] = [];
  for (const provider of chain.providers) {
    const available = await provider.isAvailable();
    if (available) {
      availableProviders.push(provider);
    }
  }

  // If no providers available, return helpful error
  if (availableProviders.length === 0) {
    return {
      success: false,
      attempts: [],
      finalError: `No AI providers configured for ${feature}. Please configure at least one of: ${chain.providers.map(p => p.name.toUpperCase()).join(', ')}`,
    };
  }

  // Try each provider in order
  for (const providerConfig of availableProviders) {
    const startTime = Date.now();

    try {
      console.log(`Trying provider: ${providerConfig.name} (priority ${providerConfig.priority})`);

      const result = await executeWithRetry(
        () => generateFn(providerConfig.name, request)
      );

      const duration = Date.now() - startTime;

      // Check if generation succeeded
      if (result.status === 'completed' && (result.imageUrl || result.images)) {
        attempts.push({
          provider: providerConfig.name,
          success: true,
          result,
          duration,
        });

        return {
          success: true,
          result,
          attempts,
        };
      } else {
        // Provider returned but generation failed
        attempts.push({
          provider: providerConfig.name,
          success: false,
          error: result.error || 'Generation failed without error message',
          duration,
        });
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);

      attempts.push({
        provider: providerConfig.name,
        success: false,
        error: errorMessage,
        duration,
      });

      console.error(`Provider ${providerConfig.name} failed:`, errorMessage);
    }
  }

  // All providers failed
  return {
    success: false,
    attempts,
    finalError: `All providers failed for ${feature}. Tried: ${attempts.map(a => a.provider).join(', ')}`,
  };
}

/**
 * Execute provider chain for video generation
 */
export async function executeVideoChain(
  request: VideoGenerationRequest,
  generateFn: (provider: AIProvider, request: VideoGenerationRequest) => Promise<VideoGenerationResponse>
): Promise<ChainExecutionResult> {
  const chain = providerChains['video'];
  const attempts: ProviderAttemptResult[] = [];

  // Filter to only available providers
  const availableProviders: ProviderConfig[] = [];
  for (const provider of chain.providers) {
    const available = await provider.isAvailable();
    if (available) {
      availableProviders.push(provider);
    }
  }

  if (availableProviders.length === 0) {
    return {
      success: false,
      attempts: [],
      finalError: `No AI providers configured for video generation. Please configure at least one of: ${chain.providers.map(p => p.name.toUpperCase()).join(', ')}`,
    };
  }

  // Try each provider
  for (const providerConfig of availableProviders) {
    const startTime = Date.now();

    try {
      console.log(`Trying video provider: ${providerConfig.name}`);

      const result = await executeWithRetry(
        () => generateFn(providerConfig.name, request)
      );

      const duration = Date.now() - startTime;

      if (result.status === 'completed' && result.videoUrl) {
        attempts.push({
          provider: providerConfig.name,
          success: true,
          result,
          duration,
        });

        return {
          success: true,
          result,
          attempts,
        };
      } else {
        attempts.push({
          provider: providerConfig.name,
          success: false,
          error: result.error || 'Video generation failed',
          duration,
        });
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);

      attempts.push({
        provider: providerConfig.name,
        success: false,
        error: errorMessage,
        duration,
      });

      console.error(`Video provider ${providerConfig.name} failed:`, errorMessage);
    }
  }

  return {
    success: false,
    attempts,
    finalError: `All video providers failed. Tried: ${attempts.map(a => a.provider).join(', ')}`,
  };
}

/**
 * Get list of available providers for a feature
 */
export async function getAvailableProvidersForFeature(feature: string): Promise<AIProvider[]> {
  const chain = providerChains[feature];

  if (!chain) {
    return [];
  }

  const available: AIProvider[] = [];

  for (const provider of chain.providers) {
    if (await provider.isAvailable()) {
      available.push(provider.name);
    }
  }

  return available;
}

/**
 * Check if any provider is available for a feature
 */
export async function hasAvailableProvider(feature: string): Promise<boolean> {
  const providers = await getAvailableProvidersForFeature(feature);
  return providers.length > 0;
}
