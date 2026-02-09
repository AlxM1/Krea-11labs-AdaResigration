/**
 * AgentSmith Integration Client
 * For callbacks and communication with AgentSmith workflow automation
 */

export interface AgentSmithConfig {
  baseUrl: string;
  apiKey?: string;
}

export interface WorkflowCallback {
  workflowId: string;
  executionId: string;
  status: 'completed' | 'failed';
  result?: {
    outputs?: Record<string, unknown>;
    error?: string;
  };
}

/**
 * AgentSmith HTTP Client
 */
export class AgentSmithClient {
  private baseUrl: string;
  private apiKey?: string;

  constructor(config?: AgentSmithConfig) {
    this.baseUrl = config?.baseUrl || process.env.AGENTSMITH_URL || 'http://raiser-agentsmith-backend:4000';
    this.apiKey = config?.apiKey || process.env.WEBHOOK_SECRET;
  }

  /**
   * Send workflow execution result callback to AgentSmith
   */
  async sendCallback(callback: WorkflowCallback): Promise<void> {
    try {
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };

      if (this.apiKey) {
        headers['X-Webhook-Secret'] = this.apiKey;
      }

      const response = await fetch(`${this.baseUrl}/api/webhooks/krya`, {
        method: 'POST',
        headers,
        body: JSON.stringify(callback),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`AgentSmith callback error: ${response.status} ${errorText}`);
      }

      console.log(`AgentSmith callback sent for workflow ${callback.workflowId}`);
    } catch (error) {
      console.error('Failed to send AgentSmith callback:', error);
      // Don't throw - callbacks are best-effort
    }
  }

  /**
   * Check if AgentSmith is available
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
 * Get AgentSmith client instance
 */
export function getAgentSmithClient(): AgentSmithClient {
  return new AgentSmithClient();
}
