/**
 * WhisperFlow Integration Client
 * For voice-to-text transcription
 */

export interface WhisperFlowConfig {
  baseUrl: string;
  apiKey?: string;
}

export interface TranscribeRequest {
  audioUrl?: string;
  audioData?: string; // Base64 encoded audio
  language?: string;
  prompt?: string; // Optional context/hint for better accuracy
}

export interface TranscribeResponse {
  text: string;
  language: string;
  duration: number;
  confidence?: number;
}

/**
 * WhisperFlow HTTP Client
 */
export class WhisperFlowClient {
  private baseUrl: string;
  private apiKey?: string;

  constructor(config?: WhisperFlowConfig) {
    this.baseUrl = config?.baseUrl || process.env.WHISPERFLOW_URL || 'http://raiser-whisperflow:8766';
    this.apiKey = config?.apiKey || process.env.WHISPERFLOW_API_KEY;
  }

  /**
   * Check if WhisperFlow is available
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
   * Transcribe audio to text
   */
  async transcribe(request: TranscribeRequest): Promise<TranscribeResponse> {
    try {
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };

      if (this.apiKey) {
        headers['Authorization'] = `Bearer ${this.apiKey}`;
      }

      const body: Record<string, unknown> = {
        language: request.language || 'auto',
      };

      if (request.audioUrl) {
        body.audioUrl = request.audioUrl;
      } else if (request.audioData) {
        body.audioData = request.audioData;
      } else {
        throw new Error('Either audioUrl or audioData is required');
      }

      if (request.prompt) {
        body.prompt = request.prompt;
      }

      const response = await fetch(`${this.baseUrl}/api/transcribe`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`WhisperFlow error: ${response.status} ${errorText}`);
      }

      const data = await response.json();

      return {
        text: data.text || data.transcription || '',
        language: data.language || request.language || 'en',
        duration: data.duration || 0,
        confidence: data.confidence,
      };
    } catch (error) {
      throw new Error(
        `WhisperFlow transcription failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get supported languages
   */
  async getSupportedLanguages(): Promise<string[]> {
    try {
      const headers: HeadersInit = {};

      if (this.apiKey) {
        headers['Authorization'] = `Bearer ${this.apiKey}`;
      }

      const response = await fetch(`${this.baseUrl}/api/languages`, {
        headers,
      });

      if (!response.ok) {
        // Return default languages if endpoint not available
        return ['auto', 'en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'ja', 'ko', 'zh'];
      }

      const data = await response.json();
      return data.languages || [];
    } catch (error) {
      console.error('Failed to fetch supported languages:', error);
      return ['auto', 'en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'ja', 'ko', 'zh'];
    }
  }
}

/**
 * Check if WhisperFlow is available
 */
export async function checkWhisperFlowHealth(): Promise<boolean> {
  if (!process.env.WHISPERFLOW_URL) {
    return false;
  }

  const client = new WhisperFlowClient();
  return await client.isAvailable();
}

/**
 * Get WhisperFlow client instance
 */
export function getWhisperFlowClient(): WhisperFlowClient {
  return new WhisperFlowClient();
}
