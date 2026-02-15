"use client";

import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Wand2,
  Upload,
  Download,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Sparkles,
  Image as ImageIcon,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";
import { useModels } from "@/hooks/use-models";

const scaleOptions = [
  { value: "1", label: "1x", pixels: "Same size" },
  { value: "2", label: "2x", pixels: "4x pixels" },
  { value: "4", label: "4x", pixels: "16x pixels" },
  { value: "8", label: "8x", pixels: "64x pixels" },
];

export default function EnhancerPage() {
  const { models: enhancerModels, bestModel } = useModels("enhance");
  const [inputImage, setInputImage] = useState<string | null>(null);
  const [outputImage, setOutputImage] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState("");

  // Auto-select best model
  if (bestModel && !selectedModel) {
    setSelectedModel(bestModel.id);
  }
  const [scale, setScale] = useState("2");
  const [denoise, setDenoise] = useState(50);
  const [sharpness, setSharpness] = useState(50);
  const [isProcessing, setIsProcessing] = useState(false);
  const [compareMode, setCompareMode] = useState(false);
  const [comparePosition, setComparePosition] = useState(50);

  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error("Image must be less than 10MB");
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        setInputImage(event.target?.result as string);
        setOutputImage(null);
      };
      reader.readAsDataURL(file);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setInputImage(event.target?.result as string);
        setOutputImage(null);
      };
      reader.readAsDataURL(file);
    }
  }, []);

  const handleEnhance = async () => {
    if (!inputImage) {
      toast.error("Please upload an image first");
      return;
    }

    setIsProcessing(true);

    try {
      // Convert data URL to file and upload
      const blob = await fetch(inputImage).then((r) => r.blob());
      const formData = new FormData();
      formData.append("file", blob, "input.png");

      const uploadResponse = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const uploadData = await uploadResponse.json();
      if (!uploadData.url) {
        throw new Error("Failed to upload image");
      }

      const response = await fetch("/api/enhance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageUrl: uploadData.url,
          scale: scale,
          model: selectedModel,
          denoise,
        }),
      });

      const data = await response.json();

      if (data.imageUrl) {
        setOutputImage(data.imageUrl);
        toast.success("Image enhanced successfully!");
      } else {
        throw new Error(data.error || "Enhancement failed");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Enhancement failed");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (outputImage) {
      const a = document.createElement("a");
      a.href = outputImage;
      a.download = `krya-enhanced-${scale}x-${Date.now()}.png`;
      a.click();
    }
  };

  const handleReset = () => {
    setInputImage(null);
    setOutputImage(null);
  };

  return (
    <div className="flex h-full p-4 gap-4">
      {/* Left Panel - Controls */}
      <div className="w-80 shrink-0 flex flex-col bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] overflow-hidden">
        <div className="p-4 border-b border-border">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Wand2 className="h-5 w-5" />
            Image Enhancer
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Upscale images up to 8x with AI
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Model Selection */}
          <div>
            <label className="text-sm font-medium mb-2 block">Enhancement Model</label>
            <Select
              value={selectedModel}
              onChange={setSelectedModel}
              options={enhancerModels.map((m) => ({ value: m.id, label: m.name }))}
            />
            <p className="text-xs text-[#555] mt-1">
              {enhancerModels.find((m) => m.id === selectedModel)?.description}
            </p>
          </div>

          {/* Scale Selection */}
          <div>
            <label className="text-sm font-medium mb-2 block">Upscale Factor</label>
            <div className="grid grid-cols-4 gap-2">
              {scaleOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setScale(option.value)}
                  className={cn(
                    "py-3 rounded-lg border text-center transition-all duration-150",
                    scale === option.value
                      ? "border-transparent bg-[#6c5ce7] text-white"
                      : "border-[#2a2a2a] text-[#888] hover:border-[#333]"
                  )}
                >
                  <div className="text-lg font-bold">{option.label}</div>
                  <div className="text-xs text-muted-foreground">{option.pixels}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Denoise */}
          <Slider
            label="Denoise Strength"
            value={denoise}
            onChange={setDenoise}
            min={0}
            max={100}
          />

          {/* Sharpness */}
          <Slider
            label="Sharpness"
            value={sharpness}
            onChange={setSharpness}
            min={0}
            max={100}
          />

          {/* Face Enhancement */}
          {(selectedModel === "gfpgan" || selectedModel === "codeformer") && (
            <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
              <p className="text-sm font-medium mb-1">Face Enhancement Active</p>
              <p className="text-xs text-muted-foreground">
                This model specializes in restoring and enhancing facial features
              </p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="p-4 border-t border-border space-y-3">
          <Button
            variant="gradient"
            className="w-full gap-2"
            size="lg"
            onClick={handleEnhance}
            disabled={!inputImage}
            isLoading={isProcessing}
          >
            <Sparkles className="h-5 w-5" />
            Enhance Image
          </Button>

          {outputImage && (
            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={handleDownload}
            >
              <Download className="h-4 w-4" />
              Download Result
            </Button>
          )}
        </div>
      </div>

      {/* Right Panel - Preview */}
      <div className="flex-1 flex flex-col">
        {/* Toolbar */}
        <div className="h-14 border-b border-border px-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={handleReset}>
              <RotateCcw className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon">
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon">
              <ZoomOut className="h-4 w-4" />
            </Button>
          </div>

          {inputImage && outputImage && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Compare:</span>
              <button
                onClick={() => setCompareMode(!compareMode)}
                className={cn(
                  "px-3 py-1 rounded-lg text-sm transition-colors",
                  compareMode
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted hover:bg-muted/80"
                )}
              >
                {compareMode ? "On" : "Off"}
              </button>
            </div>
          )}

          <div className="flex items-center gap-2">
            <input
              type="file"
              id="image-upload"
              accept="image/*"
              className="hidden"
              onChange={handleImageUpload}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => document.getElementById("image-upload")?.click()}
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload
            </Button>
          </div>
        </div>

        {/* Preview Area */}
        <div className="flex-1 p-6 overflow-auto">
          {!inputImage ? (
            <div
              className="h-full border-2 border-dashed border-[#2a2a2a] rounded-xl flex items-center justify-center cursor-pointer hover:border-[#333] transition-colors"
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => document.getElementById("image-upload")?.click()}
            >
              <div className="text-center">
                <div className="w-20 h-20 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
                  <Upload className="h-8 w-8 text-[#333]" strokeWidth={1.5} />
                </div>
                <h3 className="text-lg font-semibold mb-2">Upload an image</h3>
                <p className="text-[#555] text-sm mb-4">
                  Drag and drop or click to browse
                </p>
                <p className="text-xs text-[#555]">
                  Supports JPG, PNG, WebP up to 10MB
                </p>
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center gap-8">
              {/* Before */}
              <div className="flex flex-col items-center gap-3">
                <Badge variant="outline">Original</Badge>
                <div className="relative rounded-xl overflow-hidden border border-border">
                  <img
                    src={inputImage}
                    alt="Original"
                    className="max-h-[60vh] object-contain"
                  />
                </div>
              </div>

              {/* Arrow */}
              <div className="flex flex-col items-center gap-2">
                {isProcessing ? (
                  <div className="w-12 h-12 rounded-full border-4 border-primary border-t-transparent animate-spin" />
                ) : (
                  <ArrowRight className="h-8 w-8 text-primary" />
                )}
              </div>

              {/* After */}
              <div className="flex flex-col items-center gap-3">
                <Badge variant={outputImage ? "success" : "outline"}>
                  Enhanced {scale}x
                </Badge>
                <div className="relative rounded-xl overflow-hidden border border-border">
                  {outputImage ? (
                    <img
                      src={outputImage}
                      alt="Enhanced"
                      className="max-h-[60vh] object-contain"
                    />
                  ) : (
                    <div className="w-64 h-64 bg-muted flex items-center justify-center">
                      <ImageIcon className="h-12 w-12 text-[#333]" strokeWidth={1.5} />
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
