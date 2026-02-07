"use client";

import { useRef, useEffect, useCallback, useState, forwardRef, useImperativeHandle } from "react";
import { useCanvasStore } from "@/stores/canvas-store";

export interface DrawingCanvasHandle {
  clear: () => void;
}

interface DrawingCanvasProps {
  onCanvasUpdate?: (imageData: ImageData) => void;
  width?: number;
  height?: number;
}

export const DrawingCanvas = forwardRef<DrawingCanvasHandle, DrawingCanvasProps>(
  function DrawingCanvas({ onCanvasUpdate, width = 512, height = 512 }, ref) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [lastPoint, setLastPoint] = useState<{ x: number; y: number } | null>(null);

  const {
    currentTool,
    brushSize,
    brushColor,
    brushOpacity,
    pushUndo,
  } = useCanvasStore();

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set initial background
    ctx.fillStyle = "#1a1a1a";
    ctx.fillRect(0, 0, width, height);
  }, [width, height]);

  const getCanvasPoint = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return null;

      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;

      let clientX: number, clientY: number;

      if ("touches" in e) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else {
        clientX = e.clientX;
        clientY = e.clientY;
      }

      return {
        x: (clientX - rect.left) * scaleX,
        y: (clientY - rect.top) * scaleY,
      };
    },
    []
  );

  const drawLine = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      from: { x: number; y: number },
      to: { x: number; y: number }
    ) => {
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.strokeStyle = currentTool === "eraser" ? "#1a1a1a" : brushColor;
      ctx.lineWidth = brushSize;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.globalAlpha = brushOpacity / 100;
      ctx.stroke();
      ctx.globalAlpha = 1;
    },
    [brushColor, brushSize, brushOpacity, currentTool]
  );

  const handleStart = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      const point = getCanvasPoint(e);
      if (!point) return;

      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Save current state for undo
      pushUndo(ctx.getImageData(0, 0, canvas.width, canvas.height));

      setIsDrawing(true);
      setLastPoint(point);

      // Draw a single dot
      if (currentTool === "brush" || currentTool === "eraser") {
        ctx.beginPath();
        ctx.arc(point.x, point.y, brushSize / 2, 0, Math.PI * 2);
        ctx.fillStyle = currentTool === "eraser" ? "#1a1a1a" : brushColor;
        ctx.globalAlpha = brushOpacity / 100;
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    },
    [getCanvasPoint, brushColor, brushSize, brushOpacity, currentTool, pushUndo]
  );

  const handleMove = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (!isDrawing) return;

      const point = getCanvasPoint(e);
      if (!point || !lastPoint) return;

      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      if (currentTool === "brush" || currentTool === "eraser") {
        drawLine(ctx, lastPoint, point);
      }

      setLastPoint(point);
    },
    [isDrawing, getCanvasPoint, lastPoint, currentTool, drawLine]
  );

  const handleEnd = useCallback(() => {
    setIsDrawing(false);
    setLastPoint(null);

    // Emit canvas update
    const canvas = canvasRef.current;
    if (!canvas || !onCanvasUpdate) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    onCanvasUpdate(ctx.getImageData(0, 0, canvas.width, canvas.height));
  }, [onCanvasUpdate]);

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    pushUndo(ctx.getImageData(0, 0, canvas.width, canvas.height));
    ctx.fillStyle = "#1a1a1a";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (onCanvasUpdate) {
      onCanvasUpdate(ctx.getImageData(0, 0, canvas.width, canvas.height));
    }
  }, [pushUndo, onCanvasUpdate]);

  // Expose clear function via ref
  useImperativeHandle(ref, () => ({
    clear: clearCanvas,
  }), [clearCanvas]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="rounded-lg border border-border cursor-crosshair touch-none"
      style={{ maxWidth: "100%", height: "auto" }}
      onMouseDown={handleStart}
      onMouseMove={handleMove}
      onMouseUp={handleEnd}
      onMouseLeave={handleEnd}
      onTouchStart={handleStart}
      onTouchMove={handleMove}
      onTouchEnd={handleEnd}
    />
  );
});
