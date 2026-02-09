/**
 * NVIDIA NIM Provider
 * For Kimi K2.5 LLM and other NVIDIA hosted models
 */

export interface NVIDIANIMConfig {
  apiKey: string;
  baseUrl?: string;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatCompletionRequest {
  model: string;
  messages: ChatMessage[];
  max_tokens?: number;
  temperature?: number;
  top_p?: number;
  stream?: boolean;
}

export interface ChatCompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: {
    index: number;
    message: ChatMessage;
    finish_reason: string;
  }[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * NVIDIA NIM Provider Client
 * OpenAI-compatible API
 */
export class NVIDIANIMProvider {
  private apiKey: string;
  private baseUrl: string;

  constructor(config?: NVIDIANIMConfig) {
    this.apiKey = config?.apiKey || process.env.NVIDIA_API_KEY || '';
    this.baseUrl = config?.baseUrl || 'https://integrate.api.nvidia.com/v1';
  }

  /**
   * Check if provider is configured and available
   */
  async isAvailable(): Promise<boolean> {
    if (!this.apiKey) {
      return false;
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(`${this.baseUrl}/models`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
        signal: controller.signal,
      });

      clearTimeout(timeout);
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Send chat completion request
   */
  async chatCompletion(request: ChatCompletionRequest): Promise<ChatCompletionResponse> {
    if (!this.apiKey) {
      throw new Error('NVIDIA_API_KEY not configured');
    }

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: request.model || 'moonshotai/kimi-k2.5',
        messages: request.messages,
        max_tokens: request.max_tokens || 500,
        temperature: request.temperature || 0.7,
        top_p: request.top_p || 1.0,
        stream: request.stream || false,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`NVIDIA NIM error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    return await response.json();
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

    const response = await this.chatCompletion({
      model: 'moonshotai/kimi-k2.5',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt },
      ],
      max_tokens: 300,
      temperature: 0.7,
    });

    return response.choices[0]?.message?.content || prompt;
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

    const response = await this.chatCompletion({
      model: 'moonshotai/kimi-k2.5',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 200,
      temperature: 0.5,
    });

    return response.choices[0]?.message?.content || '';
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

    const response = await this.chatCompletion({
      model: 'moonshotai/kimi-k2.5',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Prompt: "${prompt}"\n\nSuggest 3 styles:` },
      ],
      max_tokens: 400,
      temperature: 0.8,
    });

    try {
      const content = response.choices[0]?.message?.content || '[]';
      // Extract JSON from response (handle cases where LLM adds text before/after JSON)
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      return [];
    } catch {
      return [];
    }
  }

  /**
   * Caption an image (for img2img workflows)
   * Note: Kimi K2.5 doesn't support vision, so this is a placeholder
   * Use Ollama llava or Together vision models instead
   */
  async captionImage(imageUrl: string): Promise<string> {
    throw new Error('Image captioning not supported by Kimi K2.5. Use Ollama llava or Together vision models instead.');
  }

  /**
   * Parse natural language search query into filters
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

    const response = await this.chatCompletion({
      model: 'moonshotai/kimi-k2.5',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: query },
      ],
      max_tokens: 200,
      temperature: 0.3,
    });

    try {
      const content = response.choices[0]?.message?.content || '{}';
      const jsonMatch = content.match(/\{[\s\S]*\}/);
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

    // Match patterns like "7 days ago", "1 week ago", "2 months ago"
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

    // Try to parse as ISO date
    try {
      return new Date(dateStr);
    } catch {
      return now;
    }
  }
}

/**
 * Check if NVIDIA NIM is available
 */
export async function checkNVIDIANIMHealth(): Promise<boolean> {
  if (!process.env.NVIDIA_API_KEY) {
    return false;
  }

  const provider = new NVIDIANIMProvider();
  return await provider.isAvailable();
}

/**
 * Get NVIDIA NIM provider instance
 */
export function getNVIDIANIMProvider(): NVIDIANIMProvider {
  return new NVIDIANIMProvider();
}
