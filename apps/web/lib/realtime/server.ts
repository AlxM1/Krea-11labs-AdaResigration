/**
 * WebSocket Server for Real-time Canvas
 *
 * This module provides the WebSocket server implementation for real-time
 * AI generation. In production, this would run as a separate service.
 *
 * Architecture:
 * - Client sends canvas data via WebSocket
 * - Server processes through LCM/StreamDiffusion pipeline
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
 *
 * In production, this would:
 * 1. Preload the LCM/StreamDiffusion model
 * 2. Keep the model warm in GPU memory
 * 3. Process incoming frames with minimal latency
 */
export class RealtimePipeline {
  private sessions: Map<string, RealtimeSession> = new Map();
  private isInitialized: boolean = false;

  async initialize(): Promise<void> {
    // In production:
    // 1. Load LCM model
    // 2. Initialize CUDA/MPS context
    // 3. Warm up the pipeline
    console.log("Initializing real-time pipeline...");
    this.isInitialized = true;
  }

  createSession(userId: string, settings: RealtimeSettings): RealtimeSession {
    const session: RealtimeSession = {
      id: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      settings,
      isProcessing: false,
      lastFrameTime: 0,
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
      // In production, this would:
      // 1. Decode input frame
      // 2. Run through LCM pipeline
      // 3. Encode output frame

      // Simulated processing
      const output = await this.simulateGeneration(frameData, session.settings);

      const latency = performance.now() - startTime;
      session.frameCount++;
      session.lastFrameTime = Date.now();

      return { output, latency };
    } finally {
      session.isProcessing = false;
    }
  }

  private async simulateGeneration(
    input: ArrayBuffer,
    settings: RealtimeSettings
  ): Promise<ArrayBuffer> {
    // Simulate ~50ms generation time (target for real-time)
    await new Promise((resolve) => setTimeout(resolve, 50));

    // In production, return actual generated frame
    // For now, return input with modifications
    return input;
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

    // Calculate approximate FPS
    const elapsed = (Date.now() - session.lastFrameTime) / 1000;
    const fps = elapsed > 0 ? session.frameCount / elapsed : 0;

    return {
      fps: Math.round(fps),
      avgLatency: 50, // Would track actual average in production
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
 * WebSocket handler for API route
 *
 * Note: Next.js App Router doesn't support WebSocket directly.
 * In production, you would:
 * 1. Use a separate WebSocket server (e.g., with ws library)
 * 2. Use Socket.io with a custom server
 * 3. Use a service like Pusher, Ably, or PartyKit
 *
 * This is a reference implementation for the protocol.
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
