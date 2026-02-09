"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { io, Socket } from "socket.io-client";
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

  const socketRef = useRef<Socket | null>(null);
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

  // Connect to Socket.IO
  const connect = useCallback(async () => {
    if (socketRef.current?.connected) return;

    if (!endpoint) {
      setState((prev) => ({
        ...prev,
        isConnected: false,
        error: "Real-time endpoint not configured. Running in demo mode.",
      }));
      return;
    }

    try {
      const socket = io(endpoint, {
        transports: ["websocket", "polling"],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      });

      socket.on("connect", () => {
        setState((prev) => ({
          ...prev,
          isConnected: true,
          error: null,
        }));
      });

      socket.on("connected", (data: { sessionId: string }) => {
        console.log("[Realtime] Session:", data.sessionId);
      });

      socket.on("generated", (data: { frame: ArrayBuffer; latency?: number }) => {
        setOutputFrame(data.frame);
        if (data.latency) {
          setState((prev) => ({ ...prev, latency: data.latency! }));
        }
        updateFps();
      });

      socket.on("error", (data: { message: string }) => {
        setState((prev) => ({
          ...prev,
          error: data.message,
        }));
      });

      socket.on("disconnect", () => {
        setState((prev) => ({
          ...prev,
          isConnected: false,
        }));
      });

      socket.on("connect_error", () => {
        setState((prev) => ({
          ...prev,
          error: "Connection error",
        }));
      });

      socketRef.current = socket;
    } catch (error) {
      setState((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : "Connection failed",
      }));
    }
  }, [endpoint, updateFps]);

  // Disconnect
  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    setState((prev) => ({
      ...prev,
      isConnected: false,
    }));
  }, []);

  // Send canvas data for generation
  const sendFrame = useCallback(
    (canvasData: ImageData | ArrayBuffer) => {
      const socket = socketRef.current;
      if (!socket?.connected) return;

      setState((prev) => ({ ...prev, isGenerating: true }));

      // Convert ImageData to binary if needed
      if (canvasData instanceof ImageData) {
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
      }

      sendBinaryFrame(canvasData);
    },
    []
  );

  const sendBinaryFrame = useCallback(
    (imageBuffer: ArrayBuffer) => {
      const socket = socketRef.current;
      if (!socket?.connected) return;

      socket.emit("frame", {
        image: imageBuffer,
        prompt,
        strength: aiStrength / 100,
        seed: seed === -1 ? Math.floor(Math.random() * 2147483647) : seed,
        model: aiModel,
      });

      setState((prev) => ({ ...prev, isGenerating: false }));
    },
    [prompt, aiStrength, seed, aiModel]
  );

  // Update parameters without sending image
  const updateParams = useCallback(() => {
    const socket = socketRef.current;
    if (!socket?.connected) return;

    socket.emit("settings", {
      prompt,
      strength: aiStrength / 100,
      seed,
    });
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
