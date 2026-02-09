/**
 * VoiceForge Integration Client
 * For AI voice generation and video narration
 */

export interface VoiceForgeConfig {
  baseUrl: string;
  apiKey?: string;
}

export interface TTSRequest {
  text: string;
  voice?: string;
  speed?: number;
  pitch?: number;
  format?: 'mp3' | 'wav' | 'ogg';
}

export interface TTSResponse {
  audioUrl: string;
  duration: number;
  format: string;
}

export interface Voice {
  id: string;
  name: string;
  language: string;
  gender: 'male' | 'female' | 'neutral';
  style?: string;
}

/**
 * VoiceForge HTTP Client
 */
export class VoiceForgeClient {
  private baseUrl: string;
  private apiKey?: string;

  constructor(config?: VoiceForgeConfig) {
    this.baseUrl = config?.baseUrl || process.env.VOICEFORGE_URL || 'http://raiser-voiceforge:8100';
    this.apiKey = config?.apiKey || process.env.VOICEFORGE_API_KEY;
  }

  /**
   * Check if VoiceForge is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(`${this.baseUrl}/health`, {
        signal: controller.signal,
      });

      clearTimeout(timeout);
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Get list of available voices
   */
  async getVoices(): Promise<Voice[]> {
    try {
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };

      if (this.apiKey) {
        headers['Authorization'] = `Bearer ${this.apiKey}`;
      }

      const response = await fetch(`${this.baseUrl}/api/voices`, {
        headers,
      });

      if (!response.ok) {
        throw new Error(`VoiceForge voices error: ${response.statusText}`);
      }

      const data = await response.json();
      return data.voices || [];
    } catch (error) {
      console.error('Failed to fetch VoiceForge voices:', error);
      return [];
    }
  }

  /**
   * Generate TTS audio
   */
  async generateTTS(request: TTSRequest): Promise<TTSResponse> {
    try {
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };

      if (this.apiKey) {
        headers['Authorization'] = `Bearer ${this.apiKey}`;
      }

      const response = await fetch(`${this.baseUrl}/api/tts/generate`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          text: request.text,
          voice: request.voice || 'default',
          speed: request.speed || 1.0,
          pitch: request.pitch || 1.0,
          format: request.format || 'mp3',
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`VoiceForge TTS error: ${response.status} ${errorText}`);
      }

      const data = await response.json();

      return {
        audioUrl: data.audioUrl || data.url,
        duration: data.duration || 0,
        format: data.format || request.format || 'mp3',
      };
    } catch (error) {
      throw new Error(
        `VoiceForge TTS failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Generate narration script from video prompt using LLM
   */
  async generateNarrationScript(prompt: string, duration: number): Promise<string> {
    // This would ideally call VoiceForge's script generation endpoint
    // For now, we'll return a simple narration based on the prompt
    const wordsPerSecond = 2.5; // Average speaking rate
    const maxWords = Math.floor(duration * wordsPerSecond);

    // In production, this would call an LLM to generate a proper script
    // For now, return a simple version
    return `This is an AI-generated video about: ${prompt}. The scene depicts ${prompt} with stunning visual details.`;
  }

  /**
   * Merge audio with video (would call VoiceForge's video processing endpoint)
   */
  async addNarrationToVideo(
    videoUrl: string,
    audioUrl: string,
    options?: {
      volumeVideo?: number;
      volumeAudio?: number;
      fadeIn?: number;
      fadeOut?: number;
    }
  ): Promise<string> {
    try {
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };

      if (this.apiKey) {
        headers['Authorization'] = `Bearer ${this.apiKey}`;
      }

      const response = await fetch(`${this.baseUrl}/api/video/add-audio`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          videoUrl,
          audioUrl,
          volumeVideo: options?.volumeVideo || 0.7,
          volumeAudio: options?.volumeAudio || 1.0,
          fadeIn: options?.fadeIn || 0,
          fadeOut: options?.fadeOut || 0,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`VoiceForge video merge error: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      return data.videoUrl || data.url;
    } catch (error) {
      throw new Error(
        `VoiceForge video merge failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
}

/**
 * Check if VoiceForge is available
 */
export async function checkVoiceForgeHealth(): Promise<boolean> {
  if (!process.env.VOICEFORGE_URL) {
    return false;
  }

  const client = new VoiceForgeClient();
  return await client.isAvailable();
}

/**
 * Get VoiceForge client instance
 */
export function getVoiceForgeClient(): VoiceForgeClient {
  return new VoiceForgeClient();
}
