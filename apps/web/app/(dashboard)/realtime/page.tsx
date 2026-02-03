"use client";

import { useCallback, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  Zap,
  Settings2,
  Wifi,
  WifiOff,
  Camera,
  Monitor,
  Upload,
  Dice5,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { DrawingCanvas, AICanvas, Toolbar, LayerPanel } from "@/components/canvas";
import { useCanvasStore } from "@/stores/canvas-store";
import { useRealtime } from "@/hooks/use-realtime";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

const realtimeModels = [
  { value: "lcm-sdxl", label: "LCM SDXL (Fast)" },
  { value: "sdxl-turbo", label: "SDXL Turbo" },
  { value: "flux-schnell", label: "Flux Schnell" },
  { value: "sd-turbo", label: "SD Turbo" },
];

export default function RealtimePage() {
  const canvasRef = useRef<HTMLCanvasElement & { clear?: () => void }>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [inputSource, setInputSource] = useState<"draw" | "webcam" | "screen">("draw");

  const {
    prompt,
    setPrompt,
    aiStrength,
    setAiStrength,
    aiModel,
    setAiModel,
    seed,
    setSeed,
    undo,
    redo,
  } = useCanvasStore();

  const {
    isConnected,
    fps,
    latency,
    error,
    outputFrame,
    connect,
    disconnect,
    sendFrame,
  } = useRealtime();

  const handleCanvasUpdate = useCallback(
    (imageData: ImageData) => {
      if (isConnected) {
        sendFrame(imageData);
      }
    },
    [isConnected, sendFrame]
  );

  const handleConnect = () => {
    if (isConnected) {
      disconnect();
    } else {
      connect();
      toast.success("Connecting to real-time server...");
    }
  };

  const handleClear = () => {
    if (canvasRef.current?.clear) {
      canvasRef.current.clear();
    }
  };

  const handleUndo = () => {
    const imageData = undo();
    // Apply to canvas if needed
  };

  const handleRedo = () => {
    const imageData = redo();
    // Apply to canvas if needed
  };

  const handleDownload = () => {
    // Download current AI output
    if (outputFrame) {
      const blob = new Blob([outputFrame], { type: "image/jpeg" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `krya-realtime-${Date.now()}.jpg`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const randomizeSeed = () => {
    setSeed(Math.floor(Math.random() * 2147483647));
  };

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Left Toolbar */}
      <div className="w-64 border-r border-border p-4 space-y-4 overflow-y-auto">
        <Toolbar
          onClear={handleClear}
          onDownload={handleDownload}
          onUndo={handleUndo}
          onRedo={handleRedo}
        />
        <LayerPanel />
      </div>

      {/* Main Canvas Area */}
      <div className="flex-1 flex flex-col">
        {/* Top Bar */}
        <div className="h-14 border-b border-border px-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-semibold flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              Real-time Canvas
            </h1>

            {/* Connection Status */}
            <Badge variant={isConnected ? "success" : "warning"}>
              {isConnected ? (
                <>
                  <Wifi className="h-3 w-3 mr-1" />
                  Connected
                </>
              ) : (
                <>
                  <WifiOff className="h-3 w-3 mr-1" />
                  Disconnected
                </>
              )}
            </Badge>

            {isConnected && (
              <>
                <Badge variant="outline">{fps} FPS</Badge>
                <Badge variant="outline">{latency}ms</Badge>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Input Source */}
            <div className="flex rounded-lg border border-border p-1">
              <button
                onClick={() => setInputSource("draw")}
                className={cn(
                  "px-3 py-1.5 text-sm rounded-md transition-colors",
                  inputSource === "draw" && "bg-primary text-primary-foreground"
                )}
              >
                Draw
              </button>
              <button
                onClick={() => setInputSource("webcam")}
                className={cn(
                  "px-3 py-1.5 text-sm rounded-md transition-colors",
                  inputSource === "webcam" && "bg-primary text-primary-foreground"
                )}
              >
                <Camera className="h-4 w-4" />
              </button>
              <button
                onClick={() => setInputSource("screen")}
                className={cn(
                  "px-3 py-1.5 text-sm rounded-md transition-colors",
                  inputSource === "screen" && "bg-primary text-primary-foreground"
                )}
              >
                <Monitor className="h-4 w-4" />
              </button>
            </div>

            <Button
              variant={isConnected ? "outline" : "gradient"}
              size="sm"
              onClick={handleConnect}
            >
              {isConnected ? "Disconnect" : "Connect"}
            </Button>
          </div>
        </div>

        {/* Prompt Bar */}
        <div className="px-4 py-3 border-b border-border">
          <div className="flex gap-3">
            <Textarea
              placeholder="Describe what you want to create... (updates in real-time)"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="min-h-[44px] max-h-[44px] resize-none"
            />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowSettings(!showSettings)}
            >
              <Settings2 className="h-5 w-5" />
            </Button>
          </div>

          {/* Settings Panel */}
          {showSettings && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-3 pt-3 border-t border-border"
            >
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Model</label>
                  <Select
                    value={aiModel}
                    onChange={setAiModel}
                    options={realtimeModels}
                  />
                </div>
                <div>
                  <Slider
                    label="AI Strength"
                    value={aiStrength}
                    onChange={setAiStrength}
                    min={0}
                    max={100}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Seed</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={seed === -1 ? "" : seed}
                      onChange={(e) =>
                        setSeed(e.target.value ? parseInt(e.target.value) : -1)
                      }
                      placeholder="Random"
                      className="flex-1 h-10 rounded-lg border border-input bg-background px-3 text-sm"
                    />
                    <Button variant="outline" size="icon" onClick={randomizeSeed}>
                      <Dice5 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </div>

        {/* Canvas Grid */}
        <div className="flex-1 p-4 overflow-auto">
          <div className="h-full flex gap-4 items-center justify-center">
            {/* Input Canvas */}
            <div className="flex flex-col gap-2">
              <p className="text-sm text-muted-foreground text-center">Your Canvas</p>
              <DrawingCanvas
                ref={canvasRef as React.RefObject<HTMLCanvasElement>}
                onCanvasUpdate={handleCanvasUpdate}
                width={512}
                height={512}
              />
            </div>

            {/* Arrow */}
            <div className="flex flex-col items-center gap-2">
              <Zap className="h-8 w-8 text-primary animate-pulse" />
              <p className="text-xs text-muted-foreground">AI Transform</p>
            </div>

            {/* AI Output Canvas */}
            <div className="flex flex-col gap-2">
              <p className="text-sm text-muted-foreground text-center">AI Output</p>
              <AICanvas
                imageData={outputFrame}
                width={512}
                height={512}
                isConnected={isConnected}
              />
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="px-4 pb-4">
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
              {error}
            </div>
          </div>
        )}

        {/* Demo Notice */}
        {!isConnected && !error && (
          <div className="px-4 pb-4">
            <div className="p-3 rounded-lg bg-primary/10 border border-primary/20 text-sm">
              <p className="font-medium mb-1">Demo Mode</p>
              <p className="text-muted-foreground">
                Real-time AI generation requires a WebSocket connection to the inference server.
                In production, connect to your fal.ai, Modal, or self-hosted GPU endpoint.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
