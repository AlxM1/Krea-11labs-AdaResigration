/**
 * LLM Client with Provider Chain
 * Orchestrates: NVIDIA NIM → Together AI → Ollama
 */

import { NvidiaNIMProvider, checkNvidiaNIMHealth } from '../ai/nvidia-nim-provider';
import { TogetherLLMProvider, checkTogetherLLMHealth } from './together-llm';
import { OllamaProvider, checkOllamaHealth } from '../ai/ollama-provider';

export type LLMProvider = 'nvidia' | 'together' | 'ollama';

export interface LLMRequest {
  prompt: string;
  systemPrompt?: string;
  maxTokens?: number;
  temperature?: number;
}

export interface LLMResponse {
  content: string;
  provider: LLMProvider;
  error?: string;
}

/**
 * LLM Provider Chain
 * Attempts providers in order: NVIDIA NIM (free) → Together AI (free tier) → Ollama (local)
 */
export class LLMClient {
  private nvidiaProvider: NvidiaNIMProvider;
  private togetherProvider: TogetherLLMProvider;
  private ollamaProvider: OllamaProvider;

  constructor() {
    this.nvidiaProvider = new NvidiaNIMProvider(process.env.NVIDIA_API_KEY || '');
    this.togetherProvider = new TogetherLLMProvider();
    this.ollamaProvider = new OllamaProvider();
  }

  /**
   * Get list of available LLM providers
   */
  async getAvailableProviders(): Promise<LLMProvider[]> {
    const providers: LLMProvider[] = [];

    if (await checkNvidiaNIMHealth()) {
      providers.push('nvidia');
    }

    if (await checkTogetherLLMHealth()) {
      providers.push('together');
    }

    if (await checkOllamaHealth()) {
      providers.push('ollama');
    }

    return providers;
  }

  /**
   * Check if any LLM provider is available
   */
  async isAvailable(): Promise<boolean> {
    const providers = await this.getAvailableProviders();
    return providers.length > 0;
  }

  /**
   * Execute LLM request with fallback chain
   */
  async complete(request: LLMRequest): Promise<LLMResponse> {
    const availableProviders = await this.getAvailableProviders();

    if (availableProviders.length === 0) {
      return {
        content: request.prompt, // Return original prompt as fallback
        provider: 'ollama',
        error: 'No LLM providers configured. Configure NVIDIA_API_KEY, TOGETHER_API_KEY, or OLLAMA_URL to enable prompt enhancement.',
      };
    }

    // Try each provider in order
    for (const providerName of availableProviders) {
      try {
        console.log(`Trying LLM provider: ${providerName}`);

        let response: string;

        switch (providerName) {
          case 'nvidia':
            response = await this.nvidiaProvider.chatCompletion(
              request.prompt,
              request.systemPrompt
            );
            break;

          case 'together':
            response = await this.togetherProvider.complete({
              prompt: request.prompt,
              systemPrompt: request.systemPrompt,
              maxTokens: request.maxTokens,
              temperature: request.temperature,
            });
            break;

          case 'ollama':
            response = await this.ollamaProvider.complete({
              prompt: request.prompt,
              systemPrompt: request.systemPrompt,
              maxTokens: request.maxTokens,
              temperature: request.temperature,
            });
            break;

          default:
            continue;
        }

        if (response) {
          return {
            content: response,
            provider: providerName,
          };
        }
      } catch (error) {
        console.error(`LLM provider ${providerName} failed:`, error);
        // Continue to next provider
      }
    }

    // All providers failed - return original prompt
    return {
      content: request.prompt,
      provider: availableProviders[0],
      error: 'All LLM providers failed',
    };
  }

  /**
   * Enhance a prompt for image generation
   */
  async enhancePrompt(prompt: string): Promise<string> {
    const systemPrompt = `You are an expert at expanding short image generation prompts into detailed, high-quality descriptions.

Your task is to take a simple prompt and expand it into a rich, detailed description that will help AI image generation models create better results.

Guidelines:
- Preserve the user's original intent and subject
- Add artistic details: lighting, composition, style, mood, atmosphere
- Include technical details: camera angle, depth of field, color palette
- Be specific but natural
- Keep it concise (2-3 sentences maximum)
- Do not add subjects or elements not implied by the original prompt
- Output ONLY the enhanced prompt, no explanations or meta-commentary

Example:
Input: "a cat on a couch"
Output: "A fluffy tabby cat lounging on a plush velvet couch, bathed in warm afternoon sunlight streaming through nearby windows. Shot with shallow depth of field, cinematic composition, cozy and inviting atmosphere with rich textures and soft shadows."`;

    const response = await this.complete({
      prompt,
      systemPrompt,
      maxTokens: 300,
      temperature: 0.7,
    });

    return response.content;
  }

  /**
   * Generate negative prompt
   */
  async generateNegativePrompt(prompt: string, style?: string): Promise<string> {
    const systemPrompt = `You are an expert at generating negative prompts for AI image generation.

Your task is to create a negative prompt that helps avoid common artifacts and issues based on the positive prompt and style.

Guidelines:
- Include common artifacts to avoid: blurry, distorted, low quality, bad anatomy, etc.
- Be context-aware (portraits: avoid extra limbs; landscapes: avoid people unless intended)
- Consider the style and subject matter
- Keep it concise and comma-separated
- Output ONLY the negative prompt, no explanations

Common negative prompt elements:
- General: blurry, low quality, distorted, deformed, ugly, bad anatomy, poorly drawn
- Portraits: extra limbs, missing limbs, fused fingers, too many fingers, long neck, mutated hands
- Landscapes: people (unless wanted), modern elements in historic scenes, text, watermarks
- Digital art: jpeg artifacts, compression, noise, grain (unless intended)`;

    const userPrompt = style
      ? `Positive prompt: "${prompt}"\nStyle: ${style}\n\nGenerate a negative prompt:`
      : `Positive prompt: "${prompt}"\n\nGenerate a negative prompt:`;

    const response = await this.complete({
      prompt: userPrompt,
      systemPrompt,
      maxTokens: 200,
      temperature: 0.5,
    });

    return response.content;
  }

  /**
   * Suggest styles based on prompt
   */
  async suggestStyles(prompt: string): Promise<{ style: string; model: string; reason: string }[]> {
    const systemPrompt = `You are an AI art expert. Given a prompt, suggest 3 compatible art styles and recommend the best AI model for each.

Available models: FLUX (photorealistic, detailed), SDXL (versatile, balanced), SD3 (fast, good for concepts), Playground v2.5 (vibrant, artistic)

Output format (JSON array):
[
  {"style": "Style Name", "model": "Model Name", "reason": "Why this works"},
  ...
]

Keep reasons concise (one sentence).`;

    const response = await this.complete({
      prompt: `Prompt: "${prompt}"\n\nSuggest 3 styles:`,
      systemPrompt,
      maxTokens: 400,
      temperature: 0.8,
    });

    try {
      // Extract JSON from response
      const jsonMatch = response.content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      return [];
    } catch {
      return [];
    }
  }

  /**
   * Parse natural language search query
   */
  async parseSearchQuery(query: string): Promise<{
    timeRange?: { start?: Date; end?: Date };
    styleFilter?: string;
    subjectFilter?: string;
    modelFilter?: string;
  }> {
    const systemPrompt = `You are a search query parser. Parse natural language queries into structured filters for an AI image generation gallery.

Output format (JSON):
{
  "timeRange": {"start": "ISO date", "end": "ISO date"},
  "styleFilter": "style name",
  "subjectFilter": "subject description",
  "modelFilter": "model name"
}

Examples:
- "show me my anime portraits from last week" → {"timeRange": {"start": "<7 days ago>"}, "styleFilter": "anime", "subjectFilter": "portrait"}
- "flux images of cats" → {"modelFilter": "flux", "subjectFilter": "cat"}

Only include fields that are mentioned. Output ONLY the JSON, no explanations.`;

    const response = await this.complete({
      prompt: query,
      systemPrompt,
      maxTokens: 200,
      temperature: 0.3,
    });

    try {
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);

        // Convert relative dates to absolute
        if (parsed.timeRange?.start && typeof parsed.timeRange.start === 'string') {
          parsed.timeRange.start = this.parseRelativeDate(parsed.timeRange.start);
        }
        if (parsed.timeRange?.end && typeof parsed.timeRange.end === 'string') {
          parsed.timeRange.end = this.parseRelativeDate(parsed.timeRange.end);
        }

        return parsed;
      }
      return {};
    } catch {
      return {};
    }
  }

  /**
   * Parse relative dates like "<7 days ago>" into Date objects
   */
  private parseRelativeDate(dateStr: string): Date {
    const now = new Date();

    const match = dateStr.match(/(\d+)\s+(day|week|month|year)s?\s+ago/i);
    if (match) {
      const amount = parseInt(match[1]);
      const unit = match[2].toLowerCase();

      switch (unit) {
        case 'day':
          return new Date(now.getTime() - amount * 24 * 60 * 60 * 1000);
        case 'week':
          return new Date(now.getTime() - amount * 7 * 24 * 60 * 60 * 1000);
        case 'month':
          return new Date(now.getTime() - amount * 30 * 24 * 60 * 60 * 1000);
        case 'year':
          return new Date(now.getTime() - amount * 365 * 24 * 60 * 60 * 1000);
      }
    }

    try {
      return new Date(dateStr);
    } catch {
      return now;
    }
  }
}

/**
 * Get singleton LLM client instance
 */
let llmClient: LLMClient | null = null;

export function getLLMClient(): LLMClient {
  if (!llmClient) {
    llmClient = new LLMClient();
  }
  return llmClient;
}

/**
 * Check if LLM features are available
 */
export async function hasLLMSupport(): Promise<boolean> {
  const client = getLLMClient();
  return await client.isAvailable();
}
