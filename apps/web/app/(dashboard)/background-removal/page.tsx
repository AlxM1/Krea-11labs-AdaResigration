"use client";

import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Eraser,
  Upload,
  Download,
  Image as ImageIcon,
  ArrowRight,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

export default function BackgroundRemovalPage() {
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleImageUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        if (file.size > 10 * 1024 * 1024) {
          toast.error("Image must be less than 10MB");
          return;
        }
        const reader = new FileReader();
        reader.onload = (event) => {
          setUploadedImage(event.target?.result as string);
          setResultImage(null);
        };
        reader.readAsDataURL(file);
      }
    },
    []
  );

  const handleDrop = useCallback((e: React.DragEvent) => {
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
        setUploadedImage(event.target?.result as string);
        setResultImage(null);
      };
      reader.readAsDataURL(file);
    } else {
      toast.error("Please upload a valid image file");
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleRemoveBackground = async () => {
    if (!uploadedImage) {
      toast.error("Please upload an image first");
      return;
    }

    setIsProcessing(true);
    setResultImage(null);

    try {
      const res = await fetch("/api/generate/background-removal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageUrl: uploadedImage,
          async: false,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Background removal failed");
      }

      setResultImage(data.imageUrl || data.outputUrl || data.result);
      toast.success("Background removed successfully!");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Background removal failed"
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (resultImage) {
      const a = document.createElement("a");
      a.href = resultImage;
      a.download = `krya-bg-removed-${Date.now()}.png`;
      a.click();
    }
  };

  const handleReset = () => {
    setUploadedImage(null);
    setResultImage(null);
  };

  return (
    <div className="flex h-[calc(100vh-3.5rem)]">
      {/* Left Panel - Controls */}
      <div className="w-96 border-r border-border flex flex-col">
        <div className="p-4 border-b border-border">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Eraser className="h-5 w-5" />
            Background Removal
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Remove backgrounds instantly with AI
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Image Upload */}
          <div>
            <label className="text-sm font-medium mb-2 block">
              Upload Image
            </label>
            <div
              className={cn(
                "border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors",
                isDragOver
                  ? "border-primary bg-primary/5"
                  : uploadedImage
                    ? "border-primary"
                    : "border-border hover:border-primary/50"
              )}
              onClick={() =>
                document.getElementById("bg-removal-upload")?.click()
              }
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
            >
              {uploadedImage ? (
                <img
                  src={uploadedImage}
                  alt="Uploaded"
                  className="max-h-48 mx-auto rounded-lg"
                />
              ) : (
                <div className="py-8">
                  <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Click to upload or drag and drop
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Supports JPG, PNG, WebP up to 10MB
                  </p>
                </div>
              )}
            </div>
            <input
              id="bg-removal-upload"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageUpload}
            />
          </div>

          {/* Info */}
          <div className="p-3 rounded-lg bg-muted/50 text-sm">
            <p className="font-medium mb-1">How it works:</p>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>1. Upload any image with a subject</li>
              <li>2. AI detects and isolates the foreground</li>
              <li>3. Download your transparent PNG result</li>
            </ul>
          </div>

          {/* Image Info */}
          {uploadedImage && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3 rounded-lg bg-primary/10 border border-primary/20"
            >
              <p className="text-sm font-medium mb-1">Image Ready</p>
              <p className="text-xs text-muted-foreground">
                Click the button below to remove the background
              </p>
            </motion.div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="p-4 border-t border-border space-y-3">
          <Button
            variant="gradient"
            className="w-full gap-2"
            size="lg"
            onClick={handleRemoveBackground}
            disabled={!uploadedImage}
            isLoading={isProcessing}
          >
            <Sparkles className="h-5 w-5" />
            Remove Background
          </Button>

          {resultImage && (
            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={handleDownload}
            >
              <Download className="h-4 w-4" />
              Download Transparent PNG
            </Button>
          )}

          {uploadedImage && (
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
          {!uploadedImage ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <div className="w-32 h-32 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
                  <Eraser className="h-12 w-12 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2">
                  No image uploaded
                </h3>
                <p className="text-muted-foreground max-w-md">
                  Upload an image to remove its background and get a transparent
                  PNG
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
                    src={uploadedImage}
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
              </div>

              {/* Result */}
              <div className="flex flex-col items-center gap-3">
                <Badge variant={resultImage ? "success" : "outline"}>
                  Transparent
                </Badge>
                <div className="relative rounded-xl overflow-hidden border border-border">
                  {resultImage ? (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.3 }}
                    >
                      {/* Checkerboard background to show transparency */}
                      <div
                        className="relative"
                        style={{
                          backgroundImage:
                            "repeating-conic-gradient(#808080 0% 25%, transparent 0% 50%)",
                          backgroundSize: "16px 16px",
                        }}
                      >
                        <img
                          src={resultImage}
                          alt="Background Removed"
                          className="max-h-[60vh] object-contain relative z-10"
                        />
                      </div>
                    </motion.div>
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
