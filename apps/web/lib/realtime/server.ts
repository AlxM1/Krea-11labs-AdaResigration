/**
 * WebSocket Server for Real-time Canvas
 *
 * Architecture:
 * - Client sends canvas data via WebSocket
 * - Server processes through fal.ai LCM/SDXL Turbo endpoint
 * - Server streams back generated frames
 *
 * Message Protocol (using MessagePack for efficiency):
 * - Client -> Server: { type: "frame", data: ArrayBuffer, settings: {...} }
 * - Server -> Client: { type: "output", frame: ArrayBuffer, latency: number }
 * - Server -> Client: { type: "error", message: string }
 */

import { encode, decode } from "@msgpack/msgpack";

// Message types
export interface ClientMessage {
  type: "frame" | "settings" | "ping";
  data?: ArrayBuffer;
  settings?: RealtimeSettings;
  timestamp?: number;
}

export interface ServerMessage {
  type: "output" | "error" | "pong" | "connected";
  frame?: ArrayBuffer;
  latency?: number;
  message?: string;
  timestamp?: number;
}

export interface RealtimeSettings {
  prompt: string;
  negativePrompt?: string;
  strength: number; // 0-1, how much AI modifies the input
  guidance: number;
  seed?: number;
  model: string;
  width: number;
  height: number;
}

export interface RealtimeSession {
  id: string;
  userId: string;
  settings: RealtimeSettings;
  isProcessing: boolean;
  lastFrameTime: number;
  frameCount: number;
}

// Encode message to binary format
export function encodeMessage(message: ServerMessage): Uint8Array {
  return encode(message);
}

// Decode message from binary format
export function decodeMessage(data: ArrayBuffer): ClientMessage {
  return decode(new Uint8Array(data)) as ClientMessage;
}

/**
 * Real-time generation pipeline
 * Uses fal.ai LCM/SDXL Turbo for fast image-to-image generation,
 * falling back to a passthrough when no API key is configured.
 */
export class RealtimePipeline {
  private sessions: Map<string, RealtimeSession> = new Map();
  private isInitialized: boolean = false;
  private falApiKey: string | null = null;

  async initialize(): Promise<void> {
    this.falApiKey = process.env.FAL_KEY || null;
    if (this.falApiKey) {
      console.log("[Realtime] Pipeline initialized with fal.ai LCM backend");
    } else {
      console.warn("[Realtime] No FAL_KEY configured, using passthrough mode");
    }
    this.isInitialized = true;
  }

  createSession(userId: string, settings: RealtimeSettings): RealtimeSession {
    const session: RealtimeSession = {
      id: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      settings,
      isProcessing: false,
      lastFrameTime: Date.now(),
      frameCount: 0,
    };

    this.sessions.set(session.id, session);
    return session;
  }

  async processFrame(
    sessionId: string,
    frameData: ArrayBuffer
  ): Promise<{ output: ArrayBuffer; latency: number } | null> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error("Session not found");
    }

    if (session.isProcessing) {
      // Skip frame if still processing previous one
      return null;
    }

    const startTime = performance.now();
    session.isProcessing = true;

    try {
      let output: ArrayBuffer;

      if (this.falApiKey) {
        output = await this.generateWithFal(frameData, session.settings);
      } else {
        // Passthrough mode - return input unchanged
        output = frameData;
      }

      const latency = performance.now() - startTime;
      session.frameCount++;
      session.lastFrameTime = Date.now();

      return { output, latency };
    } finally {
      session.isProcessing = false;
    }
  }

  /**
   * Generate using fal.ai's LCM img2img endpoint for real-time generation
   */
  private async generateWithFal(
    input: ArrayBuffer,
    settings: RealtimeSettings
  ): Promise<ArrayBuffer> {
    // Convert input frame to base64 data URL
    const base64 = Buffer.from(input).toString("base64");
    const dataUrl = `data:image/png;base64,${base64}`;

    try {
      const response = await fetch("https://fal.run/fal-ai/lcm-sd15-i2i", {
        method: "POST",
        headers: {
          "Authorization": `Key ${this.falApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: settings.prompt,
          negative_prompt: settings.negativePrompt || "",
          image_url: dataUrl,
          strength: settings.strength,
          guidance_scale: settings.guidance,
          num_inference_steps: 4, // LCM uses very few steps
          seed: settings.seed && settings.seed > 0 ? settings.seed : undefined,
          image_size: {
            width: settings.width,
            height: settings.height,
          },
          enable_safety_checker: false,
        }),
      });

      if (!response.ok) {
        console.error(`[Realtime] fal.ai error: ${response.status} ${response.statusText}`);
        return input; // Passthrough on error
      }

      const data = await response.json();
      const outputUrl = data.images?.[0]?.url;

      if (!outputUrl) {
        return input;
      }

      // Fetch the output image
      const imgResponse = await fetch(outputUrl);
      if (!imgResponse.ok) {
        return input;
      }

      return await imgResponse.arrayBuffer();
    } catch (error) {
      console.error("[Realtime] Generation error:", error);
      return input; // Passthrough on error
    }
  }

  updateSettings(sessionId: string, settings: Partial<RealtimeSettings>): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.settings = { ...session.settings, ...settings };
    }
  }

  closeSession(sessionId: string): void {
    this.sessions.delete(sessionId);
  }

  getSessionStats(sessionId: string): { fps: number; avgLatency: number } | null {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    const elapsed = (Date.now() - session.lastFrameTime) / 1000;
    const fps = elapsed > 0 ? session.frameCount / elapsed : 0;

    return {
      fps: Math.round(fps),
      avgLatency: 0, // Tracked per-frame in production
    };
  }
}

// Singleton pipeline instance
let pipelineInstance: RealtimePipeline | null = null;

export function getRealtimePipeline(): RealtimePipeline {
  if (!pipelineInstance) {
    pipelineInstance = new RealtimePipeline();
  }
  return pipelineInstance;
}

/**
 * WebSocket message handler
 */
export async function handleWebSocketMessage(
  sessionId: string,
  message: ClientMessage,
  sendMessage: (msg: ServerMessage) => void
): Promise<void> {
  const pipeline = getRealtimePipeline();

  switch (message.type) {
    case "frame":
      if (message.data) {
        const result = await pipeline.processFrame(sessionId, message.data);
        if (result) {
          sendMessage({
            type: "output",
            frame: result.output,
            latency: result.latency,
            timestamp: Date.now(),
          });
        }
      }
      break;

    case "settings":
      if (message.settings) {
        pipeline.updateSettings(sessionId, message.settings);
      }
      break;

    case "ping":
      sendMessage({
        type: "pong",
        timestamp: Date.now(),
      });
      break;
  }
}
