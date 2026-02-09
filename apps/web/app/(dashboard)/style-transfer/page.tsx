"use client";

import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Paintbrush,
  Upload,
  Download,
  Image as ImageIcon,
  ArrowRight,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

const stylePresets = [
  {
    id: "oil-painting",
    label: "Oil Painting",
    preview: "bg-gradient-to-br from-amber-600 to-orange-800",
  },
  {
    id: "watercolor",
    label: "Watercolor",
    preview: "bg-gradient-to-br from-sky-400 to-blue-500",
  },
  {
    id: "anime",
    label: "Anime",
    preview: "bg-gradient-to-br from-pink-500 to-purple-600",
  },
  {
    id: "pencil-sketch",
    label: "Pencil Sketch",
    preview: "bg-gradient-to-br from-gray-400 to-gray-700",
  },
  {
    id: "pop-art",
    label: "Pop Art",
    preview: "bg-gradient-to-br from-yellow-400 to-red-500",
  },
  {
    id: "impressionist",
    label: "Impressionist",
    preview: "bg-gradient-to-br from-teal-400 to-emerald-600",
  },
];

export default function StyleTransferPage() {
  const [contentImage, setContentImage] = useState<string | null>(null);
  const [styleReferenceImage, setStyleReferenceImage] = useState<string | null>(
    null
  );
  const [selectedPreset, setSelectedPreset] = useState("oil-painting");
  const [styleSource, setStyleSource] = useState<"preset" | "reference">(
    "preset"
  );
  const [strength, setStrength] = useState(65);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleContentImageUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        if (file.size > 10 * 1024 * 1024) {
          toast.error("Image must be less than 10MB");
          return;
        }
        const reader = new FileReader();
        reader.onload = (event) => {
          setContentImage(event.target?.result as string);
          setResultImage(null);
        };
        reader.readAsDataURL(file);
      }
    },
    []
  );

  const handleContentDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error("Image must be less than 10MB");
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        setContentImage(event.target?.result as string);
        setResultImage(null);
      };
      reader.readAsDataURL(file);
    } else {
      toast.error("Please upload a valid image file");
    }
  }, []);

  const handleStyleReferenceUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        if (file.size > 10 * 1024 * 1024) {
          toast.error("Image must be less than 10MB");
          return;
        }
        const reader = new FileReader();
        reader.onload = (event) => {
          setStyleReferenceImage(event.target?.result as string);
          setStyleSource("reference");
          setResultImage(null);
        };
        reader.readAsDataURL(file);
      }
    },
    []
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleGenerate = async () => {
    if (!contentImage) {
      toast.error("Please upload a content image");
      return;
    }

    setIsProcessing(true);
    setResultImage(null);

    try {
      const res = await fetch("/api/generate/style-transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contentImageUrl: contentImage,
          stylePreset:
            styleSource === "preset" ? selectedPreset : undefined,
          styleImageUrl:
            styleSource === "reference" ? styleReferenceImage : undefined,
          strength: strength / 100,
          async: false,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Style transfer failed");
      }

      setResultImage(data.imageUrl || data.outputUrl || data.result);
      toast.success("Style transfer complete!");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Style transfer failed"
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (resultImage) {
      const a = document.createElement("a");
      a.href = resultImage;
      a.download = `krya-style-transfer-${selectedPreset}-${Date.now()}.png`;
      a.click();
    }
  };

  const handleReset = () => {
    setContentImage(null);
    setStyleReferenceImage(null);
    setResultImage(null);
  };

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Left Panel - Controls */}
      <div className="w-96 border-r border-border flex flex-col">
        <div className="p-4 border-b border-border">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Paintbrush className="h-5 w-5" />
            Style Transfer
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Transform images with artistic styles
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Content Image Upload */}
          <div>
            <label className="text-sm font-medium mb-2 block">
              Content Image
            </label>
            <div
              className={cn(
                "border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors",
                isDragOver
                  ? "border-primary bg-primary/5"
                  : contentImage
                    ? "border-primary"
                    : "border-border hover:border-primary/50"
              )}
              onClick={() =>
                document.getElementById("content-image-upload")?.click()
              }
              onDrop={handleContentDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
            >
              {contentImage ? (
                <img
                  src={contentImage}
                  alt="Content"
                  className="max-h-40 mx-auto rounded-lg"
                />
              ) : (
                <div className="py-8">
                  <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Click to upload or drag and drop
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    The image whose content you want to keep
                  </p>
                </div>
              )}
            </div>
            <input
              id="content-image-upload"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleContentImageUpload}
            />
          </div>

          {/* Style Preset Selector */}
          <div>
            <label className="text-sm font-medium mb-2 block">
              Style Preset
            </label>
            <div className="grid grid-cols-3 gap-2">
              {stylePresets.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => {
                    setSelectedPreset(preset.id);
                    setStyleSource("preset");
                  }}
                  className={cn(
                    "aspect-square rounded-lg flex items-center justify-center text-white text-xs font-medium transition-all",
                    preset.preview,
                    styleSource === "preset" && selectedPreset === preset.id
                      ? "ring-2 ring-primary ring-offset-2 ring-offset-background scale-105"
                      : "opacity-80 hover:opacity-100"
                  )}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* OR Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground font-medium">
              OR
            </span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* Style Reference Image Upload */}
          <div>
            <label className="text-sm font-medium mb-2 block">
              Style Reference Image
            </label>
            <div
              className={cn(
                "border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors",
                styleSource === "reference" && styleReferenceImage
                  ? "border-primary"
                  : "border-border hover:border-primary/50"
              )}
              onClick={() =>
                document.getElementById("style-ref-upload")?.click()
              }
            >
              {styleReferenceImage ? (
                <img
                  src={styleReferenceImage}
                  alt="Style Reference"
                  className="max-h-32 mx-auto rounded-lg"
                />
              ) : (
                <div className="py-4">
                  <ImageIcon className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Upload a style reference image
                  </p>
                </div>
              )}
            </div>
            <input
              id="style-ref-upload"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleStyleReferenceUpload}
            />
          </div>

          {/* Strength Slider */}
          <Slider
            label="Style Strength"
            value={strength}
            onChange={setStrength}
            min={10}
            max={100}
          />

          {/* Current Selection Info */}
          <div className="p-3 rounded-lg bg-muted/50 text-sm">
            <p className="font-medium mb-1">Current Style:</p>
            <p className="text-xs text-muted-foreground">
              {styleSource === "preset"
                ? `Preset: ${stylePresets.find((s) => s.id === selectedPreset)?.label}`
                : "Custom reference image"}
              {" | "}Strength: {strength}%
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="p-4 border-t border-border space-y-3">
          <Button
            variant="gradient"
            className="w-full gap-2"
            size="lg"
            onClick={handleGenerate}
            disabled={!contentImage}
            isLoading={isProcessing}
          >
            <Sparkles className="h-5 w-5" />
            Apply Style
          </Button>

          {resultImage && (
            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={handleDownload}
            >
              <Download className="h-4 w-4" />
              Download Result
            </Button>
          )}

          {contentImage && (
            <Button
              variant="ghost"
              className="w-full gap-2 text-muted-foreground"
              onClick={handleReset}
            >
              <RotateCcw className="h-4 w-4" />
              Reset
            </Button>
          )}
        </div>
      </div>

      {/* Right Panel - Output */}
      <div className="flex-1 flex flex-col">
        <div className="h-14 border-b border-border px-4 flex items-center justify-between">
          <span className="font-medium">Preview</span>
          {resultImage && <Badge variant="success">Complete</Badge>}
        </div>

        <div className="flex-1 p-6 overflow-auto">
          {!contentImage ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <div className="w-32 h-32 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
                  <Paintbrush className="h-12 w-12 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2">No image yet</h3>
                <p className="text-muted-foreground max-w-md">
                  Upload a content image and choose a style to transform it with
                  AI-powered style transfer
                </p>
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center gap-8">
              {/* Original */}
              <div className="flex flex-col items-center gap-3">
                <Badge variant="outline">Original</Badge>
                <div className="relative rounded-xl overflow-hidden border border-border">
                  <img
                    src={contentImage}
                    alt="Original"
                    className="max-h-[60vh] object-contain"
                  />
                </div>
              </div>

              {/* Arrow / Spinner */}
              <div className="flex flex-col items-center gap-2">
                {isProcessing ? (
                  <div className="w-12 h-12 rounded-full border-4 border-primary border-t-transparent animate-spin" />
                ) : (
                  <ArrowRight className="h-8 w-8 text-primary" />
                )}
                {!isProcessing && (
                  <span className="text-xs text-muted-foreground mt-1">
                    {styleSource === "preset"
                      ? stylePresets.find((s) => s.id === selectedPreset)?.label
                      : "Custom"}
                  </span>
                )}
              </div>

              {/* Result */}
              <div className="flex flex-col items-center gap-3">
                <Badge variant={resultImage ? "success" : "outline"}>
                  Stylized
                </Badge>
                <div className="relative rounded-xl overflow-hidden border border-border">
                  {resultImage ? (
                    <motion.img
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.3 }}
                      src={resultImage}
                      alt="Stylized"
                      className="max-h-[60vh] object-contain"
                    />
                  ) : (
                    <div className="w-64 h-64 bg-muted flex items-center justify-center">
                      <ImageIcon className="h-12 w-12 text-muted-foreground" />
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
