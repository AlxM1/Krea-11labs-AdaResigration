"use client";

import { useRef, useEffect } from "react";
import { Sparkles } from "lucide-react";

interface AICanvasProps {
  imageData?: ArrayBuffer | null;
  width?: number;
  height?: number;
  isConnected?: boolean;
  isGenerating?: boolean;
}

export function AICanvas({
  imageData,
  width = 512,
  height = 512,
  isConnected = false,
  isGenerating = false,
}: AICanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (imageData) {
      // Decode and draw the received image
      const blob = new Blob([imageData], { type: "image/jpeg" });
      const url = URL.createObjectURL(blob);
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, width, height);
        URL.revokeObjectURL(url);
      };
      img.src = url;
    } else {
      // Draw placeholder
      ctx.fillStyle = "#0a0a0a";
      ctx.fillRect(0, 0, width, height);

      // Draw gradient background
      const gradient = ctx.createRadialGradient(
        width / 2,
        height / 2,
        0,
        width / 2,
        height / 2,
        width / 2
      );
      gradient.addColorStop(0, "rgba(124, 58, 237, 0.1)");
      gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);
    }
  }, [imageData, width, height]);

  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="rounded-lg border border-border"
        style={{ maxWidth: "100%", height: "auto" }}
      />

      {/* Status overlay */}
      {!isConnected && !imageData && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg">
          <div className="text-center">
            <Sparkles className="h-12 w-12 text-primary mx-auto mb-3 animate-pulse" />
            <p className="text-sm text-muted-foreground">
              {isGenerating ? "Generating..." : "AI output will appear here"}
            </p>
          </div>
        </div>
      )}

      {/* Connection indicator */}
      <div className="absolute top-3 right-3">
        <div
          className={`flex items-center gap-2 px-2 py-1 rounded-full text-xs ${
            isConnected
              ? "bg-green-500/20 text-green-400"
              : "bg-yellow-500/20 text-yellow-400"
          }`}
        >
          <div
            className={`w-2 h-2 rounded-full ${
              isConnected ? "bg-green-400 animate-pulse" : "bg-yellow-400"
            }`}
          />
          {isConnected ? "Connected" : "Disconnected"}
        </div>
      </div>
    </div>
  );
}
