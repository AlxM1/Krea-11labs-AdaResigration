/**
 * Newsletter Pipeline Integration Client
 * For callbacks and communication with Newsletter service
 */

export interface NewsletterCallbackConfig {
  baseUrl: string;
  apiKey?: string;
}

export interface GenerationCallback {
  requestId: string;
  status: 'completed' | 'failed';
  result?: {
    imageUrl?: string;
    videoUrl?: string;
    error?: string;
  };
}

/**
 * Newsletter Pipeline HTTP Client
 */
export class NewsletterClient {
  private baseUrl: string;
  private apiKey?: string;

  constructor(config?: NewsletterCallbackConfig) {
    this.baseUrl = config?.baseUrl || process.env.NEWSLETTER_PIPELINE_URL || 'http://raiser-newsletter-pipeline:8300';
    this.apiKey = config?.apiKey || process.env.INTERNAL_API_KEY;
  }

  /**
   * Send generation result callback to Newsletter Pipeline
   */
  async sendCallback(callback: GenerationCallback): Promise<void> {
    try {
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };

      if (this.apiKey) {
        headers['X-Internal-API-Key'] = this.apiKey;
      }

      const response = await fetch(`${this.baseUrl}/api/callbacks/krya`, {
        method: 'POST',
        headers,
        body: JSON.stringify(callback),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Newsletter callback error: ${response.status} ${errorText}`);
      }

      console.log(`Newsletter callback sent for request ${callback.requestId}`);
    } catch (error) {
      console.error('Failed to send Newsletter callback:', error);
      // Don't throw - callbacks are best-effort
    }
  }

  /**
   * Check if Newsletter Pipeline is available
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
}

/**
 * Get Newsletter client instance
 */
export function getNewsletterClient(): NewsletterClient {
  return new NewsletterClient();
}
