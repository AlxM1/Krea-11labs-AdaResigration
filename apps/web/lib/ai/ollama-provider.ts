/**
 * Ollama Local LLM Provider
 * Connects to a local Ollama instance for text generation and prompt enhancement
 */

export interface OllamaConfig {
  baseUrl: string;
  defaultModel: string;
  visionModel?: string;
}

export interface OllamaMessage {
  role: "system" | "user" | "assistant";
  content: string;
  images?: string[]; // Base64 encoded images for vision models
}

export interface OllamaGenerateRequest {
  model: string;
  prompt: string;
  system?: string;
  template?: string;
  context?: number[];
  stream?: boolean;
  raw?: boolean;
  options?: {
    temperature?: number;
    top_p?: number;
    top_k?: number;
    num_predict?: number;
    stop?: string[];
  };
}

export interface OllamaChatRequest {
  model: string;
  messages: OllamaMessage[];
  stream?: boolean;
  options?: {
    temperature?: number;
    top_p?: number;
    top_k?: number;
    num_predict?: number;
  };
}

export interface OllamaResponse {
  model: string;
  response: string;
  done: boolean;
  context?: number[];
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  eval_count?: number;
  eval_duration?: number;
}

export interface OllamaChatResponse {
  model: string;
  message: OllamaMessage;
  done: boolean;
  total_duration?: number;
}

export interface OllamaModel {
  name: string;
  modified_at: string;
  size: number;
  digest: string;
  details?: {
    format: string;
    family: string;
    families?: string[];
    parameter_size: string;
    quantization_level: string;
  };
}

/**
 * Get default Ollama configuration
 */
export function getOllamaConfig(): OllamaConfig {
  return {
    baseUrl: process.env.OLLAMA_URL || "http://127.0.0.1:11434",
    defaultModel: process.env.OLLAMA_MODEL || "llama3.2",
    visionModel: process.env.OLLAMA_VISION_MODEL || "llava",
  };
}

/**
 * Check if Ollama is available
 */
export async function checkOllamaHealth(): Promise<boolean> {
  try {
    const config = getOllamaConfig();
    const response = await fetch(`${config.baseUrl}/api/tags`, {
      method: "GET",
      signal: AbortSignal.timeout(5000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Get list of available Ollama models
 */
export async function getOllamaModels(): Promise<OllamaModel[]> {
  const config = getOllamaConfig();

  try {
    const response = await fetch(`${config.baseUrl}/api/tags`);
    if (!response.ok) return [];

    const data = await response.json();
    return data.models || [];
  } catch {
    return [];
  }
}

/**
 * Pull a model from Ollama library
 */
export async function pullOllamaModel(
  modelName: string,
  onProgress?: (status: string, completed?: number, total?: number) => void
): Promise<boolean> {
  const config = getOllamaConfig();

  try {
    const response = await fetch(`${config.baseUrl}/api/pull`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: modelName, stream: true }),
    });

    if (!response.ok || !response.body) return false;

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const lines = decoder.decode(value).split("\n").filter(Boolean);
      for (const line of lines) {
        try {
          const data = JSON.parse(line);
          if (onProgress) {
            onProgress(data.status, data.completed, data.total);
          }
        } catch {
          // Ignore parse errors
        }
      }
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Ollama Provider Class
 */
export class OllamaProvider {
  private config: OllamaConfig;

  constructor(config?: Partial<OllamaConfig>) {
    this.config = { ...getOllamaConfig(), ...config };
  }

  /**
   * Generate text completion
   */
  async generate(
    prompt: string,
    options?: {
      model?: string;
      system?: string;
      temperature?: number;
      maxTokens?: number;
    }
  ): Promise<string> {
    const model = options?.model || this.config.defaultModel;

    try {
      const response = await fetch(`${this.config.baseUrl}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          prompt,
          system: options?.system,
          stream: false,
          options: {
            temperature: options?.temperature ?? 0.7,
            num_predict: options?.maxTokens ?? 500,
          },
        } as OllamaGenerateRequest),
      });

      if (!response.ok) {
        throw new Error(`Ollama error: ${response.statusText}`);
      }

      const data: OllamaResponse = await response.json();
      return data.response;
    } catch (error) {
      throw new Error(
        `Ollama generation failed: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * Chat completion with message history
   */
  async chat(
    messages: OllamaMessage[],
    options?: {
      model?: string;
      temperature?: number;
      maxTokens?: number;
    }
  ): Promise<string> {
    const model = options?.model || this.config.defaultModel;

    try {
      const response = await fetch(`${this.config.baseUrl}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          messages,
          stream: false,
          options: {
            temperature: options?.temperature ?? 0.7,
            num_predict: options?.maxTokens ?? 500,
          },
        } as OllamaChatRequest),
      });

      if (!response.ok) {
        throw new Error(`Ollama chat error: ${response.statusText}`);
      }

      const data: OllamaChatResponse = await response.json();
      return data.message.content;
    } catch (error) {
      throw new Error(
        `Ollama chat failed: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * Generic completion method (for LLM client interface)
   */
  async complete(options: {
    prompt: string;
    systemPrompt?: string;
    maxTokens?: number;
    temperature?: number;
  }): Promise<string> {
    return this.generate(options.prompt, {
      system: options.systemPrompt,
      temperature: options.temperature,
      maxTokens: options.maxTokens,
    });
  }

  /**
   * Enhance/improve an image generation prompt
   */
  async enhancePrompt(prompt: string): Promise<string> {
    const systemPrompt = `You are an expert at writing prompts for AI image generation models like Stable Diffusion, SDXL, and Flux.
Your task is to enhance the user's prompt to produce better, more detailed images.

Guidelines:
- Add descriptive details about lighting, composition, style, and quality
- Include relevant artistic styles or techniques
- Add quality boosters like "highly detailed", "professional", "8k resolution"
- Keep the core subject/idea from the original prompt
- Output ONLY the enhanced prompt, no explanations or formatting

Example:
Input: "a cat"
Output: "a majestic fluffy cat with bright eyes, sitting elegantly, soft natural lighting, highly detailed fur texture, professional photography, shallow depth of field, 8k resolution"`;

    try {
      const enhanced = await this.generate(prompt, {
        system: systemPrompt,
        temperature: 0.7,
        maxTokens: 300,
      });

      return enhanced.trim();
    } catch {
      // Return original prompt if enhancement fails
      return prompt;
    }
  }

  /**
   * Generate negative prompt suggestions
   */
  async generateNegativePrompt(prompt: string): Promise<string> {
    const systemPrompt = `You are an expert at AI image generation. Generate a negative prompt that will help avoid common issues.
Based on the main prompt, suggest what should be avoided.
Output ONLY the negative prompt, no explanations.
Focus on: deformities, low quality, blurry, artifacts, bad anatomy, etc.`;

    try {
      const negative = await this.generate(
        `Main prompt: ${prompt}\n\nGenerate negative prompt:`,
        {
          system: systemPrompt,
          temperature: 0.5,
          maxTokens: 150,
        }
      );

      return negative.trim();
    } catch {
      // Return default negative prompt if generation fails
      return "blurry, low quality, distorted, deformed, ugly, bad anatomy, watermark, signature, text";
    }
  }

  /**
   * Describe an image using vision model
   */
  async describeImage(
    imageBase64: string,
    question?: string
  ): Promise<string> {
    const model = this.config.visionModel || "llava";
    const prompt = question || "Describe this image in detail.";

    try {
      const response = await fetch(`${this.config.baseUrl}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          prompt,
          images: [imageBase64],
          stream: false,
        }),
      });

      if (!response.ok) {
        throw new Error(`Ollama vision error: ${response.statusText}`);
      }

      const data: OllamaResponse = await response.json();
      return data.response;
    } catch (error) {
      throw new Error(
        `Ollama vision failed: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * Generate prompt variations
   */
  async generateVariations(prompt: string, count: number = 3): Promise<string[]> {
    const systemPrompt = `You are an expert at AI image generation prompts.
Generate ${count} creative variations of the given prompt.
Each variation should maintain the core concept but explore different styles, compositions, or interpretations.
Output each variation on a new line, numbered 1-${count}.
No explanations, just the prompts.`;

    try {
      const response = await this.generate(
        `Original prompt: ${prompt}\n\nGenerate ${count} variations:`,
        {
          system: systemPrompt,
          temperature: 0.9,
          maxTokens: 500,
        }
      );

      // Parse numbered variations
      const variations = response
        .split("\n")
        .filter((line) => /^\d+[.):]\s*/.test(line.trim()))
        .map((line) => line.replace(/^\d+[.):]\s*/, "").trim())
        .filter(Boolean);

      return variations.slice(0, count);
    } catch {
      return [prompt]; // Return original if failed
    }
  }

  /**
   * Translate prompt to English
   */
  async translateToEnglish(text: string): Promise<string> {
    const systemPrompt = `You are a translator. Translate the following text to English.
If the text is already in English, return it unchanged.
Output ONLY the translated text, nothing else.`;

    try {
      const translated = await this.generate(text, {
        system: systemPrompt,
        temperature: 0.3,
        maxTokens: 300,
      });

      return translated.trim();
    } catch {
      return text; // Return original if translation fails
    }
  }

  /**
   * Check if model supports vision
   */
  async supportsVision(modelName?: string): Promise<boolean> {
    const model = modelName || this.config.visionModel;
    if (!model) return false;

    const visionModels = ["llava", "bakllava", "moondream", "llava-phi3"];
    return visionModels.some((v) => model.toLowerCase().includes(v));
  }
}

export default OllamaProvider;
