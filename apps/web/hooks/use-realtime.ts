"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { encode as msgpackEncode } from "@msgpack/msgpack";
import { useCanvasStore } from "@/stores/canvas-store";

interface UseRealtimeOptions {
  endpoint?: string;
  autoConnect?: boolean;
}

interface RealtimeState {
  isConnected: boolean;
  isGenerating: boolean;
  fps: number;
  latency: number;
  error: string | null;
}

export function useRealtime(options: UseRealtimeOptions = {}) {
  const { endpoint = process.env.NEXT_PUBLIC_REALTIME_WS_URL } = options;

  const wsRef = useRef<WebSocket | null>(null);
  const frameCountRef = useRef(0);
  const lastFrameTimeRef = useRef(Date.now());

  const [state, setState] = useState<RealtimeState>({
    isConnected: false,
    isGenerating: false,
    fps: 0,
    latency: 0,
    error: null,
  });

  const [outputFrame, setOutputFrame] = useState<ArrayBuffer | null>(null);

  const { prompt, aiStrength, aiModel, seed } = useCanvasStore();

  // Calculate FPS
  const updateFps = useCallback(() => {
    const now = Date.now();
    const elapsed = now - lastFrameTimeRef.current;
    if (elapsed >= 1000) {
      setState((prev) => ({
        ...prev,
        fps: Math.round((frameCountRef.current * 1000) / elapsed),
      }));
      frameCountRef.current = 0;
      lastFrameTimeRef.current = now;
    }
    frameCountRef.current++;
  }, []);

  // Connect to WebSocket
  const connect = useCallback(async () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    if (!endpoint) {
      // Demo mode - no actual WebSocket connection
      setState((prev) => ({
        ...prev,
        isConnected: false,
        error: "Real-time endpoint not configured. Running in demo mode.",
      }));
      return;
    }

    try {
      // In production, get JWT token first
      // const tokenRes = await fetch("/api/realtime/token");
      // const { token } = await tokenRes.json();
      // const wsUrl = `${endpoint}?token=${token}`;

      const ws = new WebSocket(endpoint);

      ws.binaryType = "arraybuffer";

      ws.onopen = () => {
        setState((prev) => ({
          ...prev,
          isConnected: true,
          error: null,
        }));
      };

      ws.onmessage = (event) => {
        if (event.data instanceof ArrayBuffer) {
          // Binary frame - image data
          setOutputFrame(event.data);
          updateFps();
        } else {
          // JSON message - status update
          try {
            const message = JSON.parse(event.data);
            if (message.type === "status") {
              setState((prev) => ({
                ...prev,
                latency: message.latency_ms || prev.latency,
              }));
            }
          } catch {
            // Ignore parse errors
          }
        }
      };

      ws.onerror = () => {
        setState((prev) => ({
          ...prev,
          error: "Connection error",
        }));
      };

      ws.onclose = () => {
        setState((prev) => ({
          ...prev,
          isConnected: false,
        }));
      };

      wsRef.current = ws;
    } catch (error) {
      setState((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : "Connection failed",
      }));
    }
  }, [endpoint, updateFps]);

  // Disconnect
  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setState((prev) => ({
      ...prev,
      isConnected: false,
    }));
  }, []);

  // Send canvas data for generation
  const sendFrame = useCallback(
    (canvasData: ImageData | ArrayBuffer) => {
      const ws = wsRef.current;
      if (!ws || ws.readyState !== WebSocket.OPEN) return;

      setState((prev) => ({ ...prev, isGenerating: true }));

      // Convert ImageData to binary if needed
      let binaryData: ArrayBuffer;
      if (canvasData instanceof ImageData) {
        // Convert to PNG/JPEG for sending
        const canvas = document.createElement("canvas");
        canvas.width = canvasData.width;
        canvas.height = canvasData.height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.putImageData(canvasData, 0, 0);
          canvas.toBlob(
            (blob) => {
              if (blob) {
                blob.arrayBuffer().then((buffer) => {
                  sendBinaryFrame(buffer);
                });
              }
            },
            "image/jpeg",
            0.8
          );
        }
        return;
      } else {
        binaryData = canvasData;
      }

      sendBinaryFrame(binaryData);
    },
    []
  );

  const sendBinaryFrame = useCallback(
    (imageBuffer: ArrayBuffer) => {
      const ws = wsRef.current;
      if (!ws || ws.readyState !== WebSocket.OPEN) return;

      // Encode message with MsgPack
      const message = {
        type: "generate",
        data: {
          prompt,
          strength: aiStrength / 100,
          seed: seed === -1 ? Math.floor(Math.random() * 2147483647) : seed,
          model: aiModel,
          image: new Uint8Array(imageBuffer),
        },
      };

      try {
        const encoded = msgpackEncode(message);
        ws.send(encoded);
      } catch (error) {
        console.error("Failed to send frame:", error);
      }

      setState((prev) => ({ ...prev, isGenerating: false }));
    },
    [prompt, aiStrength, seed, aiModel]
  );

  // Update parameters without sending image
  const updateParams = useCallback(() => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;

    const message = {
      type: "update_params",
      data: {
        prompt,
        strength: aiStrength / 100,
        seed,
      },
    };

    try {
      const encoded = msgpackEncode(message);
      ws.send(encoded);
    } catch (error) {
      console.error("Failed to update params:", error);
    }
  }, [prompt, aiStrength, seed]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    ...state,
    outputFrame,
    connect,
    disconnect,
    sendFrame,
    updateParams,
  };
}
