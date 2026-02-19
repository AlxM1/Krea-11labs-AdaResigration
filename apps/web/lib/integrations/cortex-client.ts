/**
 * Cortex Integration Client
 * For reporting task activity to the Ultron Cortex orchestration service
 */

export interface CortexConfig {
  baseUrl: string;
  apiKey?: string;
}

export interface TaskActivity {
  taskId: string;
  service: string;
  operation: string;
  status: 'started' | 'processing' | 'completed' | 'failed';
  metadata?: Record<string, unknown>;
  error?: string;
  duration?: number;
}

export interface TaskMetrics {
  service: string;
  operation: string;
  provider?: string;
  duration: number;
  success: boolean;
  error?: string;
}

/**
 * Cortex HTTP Client
 */
export class CortexClient {
  private baseUrl: string;
  private apiKey?: string;
  private serviceName = 'krya';

  constructor(config?: CortexConfig) {
    this.baseUrl = config?.baseUrl || process.env.CORTEX_URL || 'http://cortex:3011';
    this.apiKey = config?.apiKey || process.env.CORTEX_API_KEY;
  }

  /**
   * Report task activity to Cortex
   */
  async reportActivity(activity: TaskActivity): Promise<void> {
    try {
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };

      if (this.apiKey) {
        headers['X-API-Key'] = this.apiKey;
      }

      const response = await fetch(`${this.baseUrl}/api/tasks/activity`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          ...activity,
          service: this.serviceName,
          timestamp: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.warn(`Cortex activity report warning: ${response.status} ${errorText}`);
        // Don't throw - telemetry is best-effort
      }
    } catch (error) {
      console.warn('Failed to report activity to Cortex:', error);
      // Don't throw - telemetry is best-effort
    }
  }

  /**
   * Report task metrics to Cortex
   */
  async reportMetrics(metrics: TaskMetrics): Promise<void> {
    try {
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };

      if (this.apiKey) {
        headers['X-API-Key'] = this.apiKey;
      }

      const response = await fetch(`${this.baseUrl}/api/metrics`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          ...metrics,
          service: this.serviceName,
          timestamp: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.warn(`Cortex metrics report warning: ${response.status} ${errorText}`);
      }
    } catch (error) {
      console.warn('Failed to report metrics to Cortex:', error);
    }
  }

  /**
   * Track image generation task
   */
  async trackImageGeneration(taskId: string, status: TaskActivity['status'], metadata?: Record<string, unknown>, error?: string): Promise<void> {
    await this.reportActivity({
      taskId,
      service: this.serviceName,
      operation: 'image-generation',
      status,
      metadata,
      error,
    });
  }

  /**
   * Track video generation task
   */
  async trackVideoGeneration(taskId: string, status: TaskActivity['status'], metadata?: Record<string, unknown>, error?: string): Promise<void> {
    await this.reportActivity({
      taskId,
      service: this.serviceName,
      operation: 'video-generation',
      status,
      metadata,
      error,
    });
  }

  /**
   * Track upscale task
   */
  async trackUpscale(taskId: string, status: TaskActivity['status'], metadata?: Record<string, unknown>, error?: string): Promise<void> {
    await this.reportActivity({
      taskId,
      service: this.serviceName,
      operation: 'upscale',
      status,
      metadata,
      error,
    });
  }

  /**
   * Check if Cortex is available
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
 * Get Cortex client instance (singleton)
 */
let cortexInstance: CortexClient | null = null;

export function getCortexClient(): CortexClient {
  if (!cortexInstance) {
    cortexInstance = new CortexClient();
  }
  return cortexInstance;
}
