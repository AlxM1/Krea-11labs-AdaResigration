/**
 * Together AI LLM Provider
 * For Kimi K2.5 and other LLMs via Together AI
 */

export interface TogetherLLMConfig {
  apiKey?: string;
  baseUrl?: string;
}

export interface LLMCompletionRequest {
  prompt: string;
  systemPrompt?: string;
  maxTokens?: number;
  temperature?: number;
}

/**
 * Together AI LLM Provider
 */
export class TogetherLLMProvider {
  private apiKey: string;
  private baseUrl: string;

  constructor(config?: TogetherLLMConfig) {
    this.apiKey = config?.apiKey || process.env.TOGETHER_API_KEY || '';
    this.baseUrl = config?.baseUrl || 'https://api.together.xyz/v1';
  }

  /**
   * Check if provider is available
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
   * Send completion request
   */
  async complete(request: LLMCompletionRequest): Promise<string> {
    if (!this.apiKey) {
      throw new Error('TOGETHER_API_KEY not configured');
    }

    const messages: { role: string; content: string }[] = [];

    if (request.systemPrompt) {
      messages.push({ role: 'system', content: request.systemPrompt });
    }

    messages.push({ role: 'user', content: request.prompt });

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'moonshotai/Kimi-K2.5',
        messages,
        max_tokens: request.maxTokens || 500,
        temperature: request.temperature || 0.7,
        top_p: 1.0,
        stop: null,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Together AI error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || '';
  }

  /**
   * Caption an image using vision model
   */
  async captionImage(imageUrl: string): Promise<string> {
    if (!this.apiKey) {
      throw new Error('TOGETHER_API_KEY not configured');
    }

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'meta-llama/Llama-3.2-11B-Vision-Instruct-Turbo',
        messages: [
          {
            role: 'system',
            content: 'You are an expert at describing images in detail for AI image generation. Focus on: subject, style, composition, colors, lighting, and mood.',
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Describe this image in detail for use as a prompt in AI image generation:',
              },
              {
                type: 'image_url',
                image_url: {
                  url: imageUrl,
                },
              },
            ],
          },
        ],
        max_tokens: 300,
        temperature: 0.5,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Together AI vision error: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || '';
  }
}

/**
 * Check Together AI LLM health
 */
export async function checkTogetherLLMHealth(): Promise<boolean> {
  if (!process.env.TOGETHER_API_KEY) {
    return false;
  }

  const provider = new TogetherLLMProvider();
  return await provider.isAvailable();
}

/**
 * Get Together LLM provider instance
 */
export function getTogetherLLMProvider(): TogetherLLMProvider {
  return new TogetherLLMProvider();
}
