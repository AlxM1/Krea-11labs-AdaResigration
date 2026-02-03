/**
 * WebSocket Client for Real-time Canvas
 *
 * Manages the connection to the real-time generation server
 * with automatic reconnection, buffering, and frame rate control.
 */

import { encode, decode } from "@msgpack/msgpack";

export interface RealtimeSettings {
  prompt: string;
  negativePrompt?: string;
  strength: number;
  guidance: number;
  seed?: number;
  model: string;
  width: number;
  height: number;
}

export interface RealtimeClientOptions {
  url: string;
  settings: RealtimeSettings;
  onFrame?: (frame: ArrayBuffer, latency: number) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Error) => void;
  targetFps?: number;
  maxReconnectAttempts?: number;
}

export type ConnectionState = "disconnected" | "connecting" | "connected" | "reconnecting";

export class RealtimeClient {
  private ws: WebSocket | null = null;
  private options: RealtimeClientOptions;
  private state: ConnectionState = "disconnected";
  private reconnectAttempts = 0;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private frameInterval: NodeJS.Timeout | null = null;
  private pendingFrame: ArrayBuffer | null = null;
  private lastSendTime = 0;
  private frameCount = 0;
  private startTime = 0;
  private latencySum = 0;

  constructor(options: RealtimeClientOptions) {
    this.options = {
      targetFps: 20,
      maxReconnectAttempts: 5,
      ...options,
    };
  }

  get connectionState(): ConnectionState {
    return this.state;
  }

  get fps(): number {
    if (this.startTime === 0) return 0;
    const elapsed = (Date.now() - this.startTime) / 1000;
    return elapsed > 0 ? Math.round(this.frameCount / elapsed) : 0;
  }

  get averageLatency(): number {
    return this.frameCount > 0 ? Math.round(this.latencySum / this.frameCount) : 0;
  }

  connect(): void {
    if (this.state === "connected" || this.state === "connecting") {
      return;
    }

    this.state = "connecting";

    try {
      this.ws = new WebSocket(this.options.url);
      this.ws.binaryType = "arraybuffer";

      this.ws.onopen = () => {
        this.state = "connected";
        this.reconnectAttempts = 0;
        this.startTime = Date.now();
        this.frameCount = 0;
        this.latencySum = 0;

        // Send initial settings
        this.sendSettings(this.options.settings);

        this.options.onConnect?.();
        this.startFrameLoop();
      };

      this.ws.onmessage = (event) => {
        this.handleMessage(event.data);
      };

      this.ws.onerror = (event) => {
        console.error("WebSocket error:", event);
        this.options.onError?.(new Error("WebSocket error"));
      };

      this.ws.onclose = () => {
        this.state = "disconnected";
        this.stopFrameLoop();
        this.options.onDisconnect?.();
        this.attemptReconnect();
      };
    } catch (error) {
      this.state = "disconnected";
      this.options.onError?.(error as Error);
      this.attemptReconnect();
    }
  }

  disconnect(): void {
    this.stopFrameLoop();
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.state = "disconnected";
  }

  sendFrame(canvasData: ArrayBuffer | ImageData): void {
    // Convert ImageData to ArrayBuffer if needed
    let frameData: ArrayBuffer;
    if (canvasData instanceof ImageData) {
      frameData = canvasData.data.buffer;
    } else {
      frameData = canvasData;
    }

    // Store frame for next send interval
    this.pendingFrame = frameData;
  }

  updateSettings(settings: Partial<RealtimeSettings>): void {
    this.options.settings = { ...this.options.settings, ...settings };
    this.sendSettings(this.options.settings);
  }

  private sendSettings(settings: RealtimeSettings): void {
    this.send({
      type: "settings",
      settings,
    });
  }

  private send(message: Record<string, unknown>): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      const encoded = encode(message);
      this.ws.send(encoded);
    }
  }

  private handleMessage(data: ArrayBuffer): void {
    try {
      const message = decode(new Uint8Array(data)) as Record<string, unknown>;

      switch (message.type) {
        case "output":
          if (message.frame) {
            this.frameCount++;
            this.latencySum += (message.latency as number) || 0;
            this.options.onFrame?.(
              message.frame as ArrayBuffer,
              (message.latency as number) || 0
            );
          }
          break;

        case "error":
          this.options.onError?.(new Error(message.message as string));
          break;

        case "pong":
          // Handle ping response for latency calculation
          break;
      }
    } catch (error) {
      console.error("Error decoding message:", error);
    }
  }

  private startFrameLoop(): void {
    const interval = 1000 / (this.options.targetFps || 20);

    this.frameInterval = setInterval(() => {
      if (this.pendingFrame && this.state === "connected") {
        this.send({
          type: "frame",
          data: this.pendingFrame,
          timestamp: Date.now(),
        });
        this.lastSendTime = Date.now();
        this.pendingFrame = null;
      }
    }, interval);
  }

  private stopFrameLoop(): void {
    if (this.frameInterval) {
      clearInterval(this.frameInterval);
      this.frameInterval = null;
    }
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= (this.options.maxReconnectAttempts || 5)) {
      console.log("Max reconnection attempts reached");
      return;
    }

    this.state = "reconnecting";
    this.reconnectAttempts++;

    // Exponential backoff
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts - 1), 30000);

    console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);

    this.reconnectTimeout = setTimeout(() => {
      this.connect();
    }, delay);
  }
}

/**
 * Create a real-time client with default settings
 */
export function createRealtimeClient(
  options: Partial<RealtimeClientOptions> & { url: string }
): RealtimeClient {
  return new RealtimeClient({
    settings: {
      prompt: "",
      strength: 0.5,
      guidance: 7.5,
      model: "lcm-lora",
      width: 512,
      height: 512,
    },
    targetFps: 20,
    maxReconnectAttempts: 5,
    ...options,
  });
}

/**
 * Helper to get WebSocket URL based on environment
 */
export function getRealtimeUrl(): string {
  if (typeof window === "undefined") {
    return "";
  }

  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const host = process.env.NEXT_PUBLIC_REALTIME_HOST || window.location.host;

  return `${protocol}//${host}/api/realtime`;
}
