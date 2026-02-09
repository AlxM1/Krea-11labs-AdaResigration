"use client";

import { useState, useRef, useEffect, lazy, Suspense } from "react";
import { motion } from "framer-motion";
import {
  Box,
  Upload,
  Download,
  RotateCcw,
  Play,
  Pause,
  Sun,
  Moon,
  Sparkles,
  Image as ImageIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

// Lazy load 3D viewer to avoid SSR issues with Three.js
const ThreeDViewer = lazy(() => import("@/components/3d/viewer"));

const models3D = [
  { value: "triposr", label: "TripoSR", description: "Fast image-to-3D" },
  { value: "trellis", label: "Trellis", description: "High quality meshes" },
  { value: "hunyuan3d", label: "Hunyuan3D", description: "Detailed textures" },
  { value: "shap-e", label: "Shap-E", description: "Text-to-3D" },
];

const exportFormats = [
  { value: "glb", label: "GLB" },
  { value: "obj", label: "OBJ" },
  { value: "fbx", label: "FBX" },
  { value: "stl", label: "STL" },
];

const lightingPresets = [
  { id: "studio", label: "Studio", icon: Sun },
  { id: "outdoor", label: "Outdoor", icon: Sun },
  { id: "night", label: "Night", icon: Moon },
];

export default function ThreeDPage() {
  const [generationType, setGenerationType] = useState<"text" | "image">("image");
  const [prompt, setPrompt] = useState("");
  const [inputImage, setInputImage] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState("triposr");
  const [exportFormat, setExportFormat] = useState("glb");
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasResult, setHasResult] = useState(false);
  const [isRotating, setIsRotating] = useState(true);
  const [lighting, setLighting] = useState("studio");
  const [modelUrl, setModelUrl] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setInputImage(event.target?.result as string);
        setGenerationType("image");
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGenerate = async () => {
    if (generationType === "text" && !prompt.trim()) {
      toast.error("Please enter a prompt");
      return;
    }
    if (generationType === "image" && !inputImage) {
      toast.error("Please upload an image");
      return;
    }

    setIsGenerating(true);

    try {
      // Upload image if using image-to-3D
      let imageUrl = inputImage;

      // For text-to-3D, we'd need to generate an image first (not implemented yet)
      if (generationType === "text") {
        toast.error("Text-to-3D coming soon. Please use Image-to-3D for now.");
        setIsGenerating(false);
        return;
      }

      // Call 3D generation API
      const response = await fetch("/api/generate/3d", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          imageUrl,
          model: selectedModel,
          format: exportFormat,
          quality: "standard",
          removeBackground: true,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "3D generation failed");
      }

      setModelUrl(data.modelUrl);
      setPreviewUrl(data.previewUrl);
      setHasResult(true);
      toast.success("3D model generated!");
    } catch (error) {
      console.error("3D generation error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to generate 3D model");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = () => {
    if (!modelUrl) {
      toast.error("No model to download");
      return;
    }

    // Create a temporary link and trigger download
    const link = document.createElement("a");
    link.href = modelUrl;
    link.download = `model-${Date.now()}.${exportFormat}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success(`Downloading ${exportFormat.toUpperCase()} file...`);
  };

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Left Panel - Controls */}
      <div className="w-80 border-r border-border flex flex-col">
        <div className="p-4 border-b border-border">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Box className="h-5 w-5" />
            3D Generation
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Create 3D objects from text or images
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Input Type Tabs */}
          <Tabs
            value={generationType}
            onValueChange={(value) => setGenerationType(value as "text" | "image")}
            className="w-full"
          >
            <TabsList className="w-full">
              <TabsTrigger
                value="image"
                className="flex-1"
              >
                Image to 3D
              </TabsTrigger>
              <TabsTrigger
                value="text"
                className="flex-1"
              >
                Text to 3D
              </TabsTrigger>
            </TabsList>

            <TabsContent value="image" className="mt-4 space-y-4">
              <div
                className={cn(
                  "border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors",
                  inputImage ? "border-primary" : "border-border hover:border-primary/50"
                )}
                onClick={() => document.getElementById("3d-upload")?.click()}
              >
                {inputImage ? (
                  <img
                    src={inputImage}
                    alt="Input"
                    className="max-h-32 mx-auto rounded-lg"
                  />
                ) : (
                  <div className="py-6">
                    <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      Upload reference image
                    </p>
                  </div>
                )}
              </div>
              <input
                id="3d-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageUpload}
              />
            </TabsContent>

            <TabsContent value="text" className="mt-4">
              <Textarea
                placeholder="Describe the 3D object you want to create..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="min-h-[120px] resize-none"
              />
            </TabsContent>
          </Tabs>

          {/* Model Selection */}
          <div>
            <label className="text-sm font-medium mb-2 block">Model</label>
            <Select
              value={selectedModel}
              onChange={setSelectedModel}
              options={models3D.map((m) => ({ value: m.value, label: m.label }))}
            />
            <p className="text-xs text-muted-foreground mt-1">
              {models3D.find((m) => m.value === selectedModel)?.description}
            </p>
          </div>

          {/* Export Format */}
          <div>
            <label className="text-sm font-medium mb-2 block">Export Format</label>
            <div className="grid grid-cols-4 gap-2">
              {exportFormats.map((format) => (
                <button
                  key={format.value}
                  onClick={() => setExportFormat(format.value)}
                  className={cn(
                    "py-2 rounded-lg border text-sm font-medium transition-colors",
                    exportFormat === format.value
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border hover:border-primary/50"
                  )}
                >
                  {format.label}
                </button>
              ))}
            </div>
          </div>

          {/* Quality Settings */}
          <Slider
            label="Mesh Quality"
            value={75}
            onChange={() => {}}
            min={0}
            max={100}
          />

          <Slider
            label="Texture Resolution"
            value={50}
            onChange={() => {}}
            min={0}
            max={100}
          />
        </div>

        {/* Action Buttons */}
        <div className="p-4 border-t border-border space-y-3">
          <Button
            variant="gradient"
            className="w-full gap-2"
            size="lg"
            onClick={handleGenerate}
            isLoading={isGenerating}
          >
            <Sparkles className="h-5 w-5" />
            Generate 3D
          </Button>

          {hasResult && (
            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={handleDownload}
            >
              <Download className="h-4 w-4" />
              Download {exportFormat.toUpperCase()}
            </Button>
          )}
        </div>
      </div>

      {/* Right Panel - 3D Viewer */}
      <div className="flex-1 flex flex-col">
        {/* Viewer Toolbar */}
        <div className="h-14 border-b border-border px-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsRotating(!isRotating)}
            >
              {isRotating ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </Button>
            <Button variant="ghost" size="icon">
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>

          {/* Lighting Presets */}
          <div className="flex items-center gap-1">
            {lightingPresets.map((preset) => (
              <button
                key={preset.id}
                onClick={() => setLighting(preset.id)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-sm transition-colors",
                  lighting === preset.id
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted"
                )}
              >
                {preset.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            {hasResult && (
              <Badge variant="success">Ready</Badge>
            )}
          </div>
        </div>

        {/* 3D Viewer */}
        <div className="flex-1 bg-gradient-to-b from-zinc-900 to-black flex items-center justify-center">
          {isGenerating ? (
            <div className="text-center">
              <div className="relative w-24 h-24 mx-auto mb-4">
                <div className="absolute inset-0 rounded-full border-4 border-primary/20" />
                <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin" />
                <Box className="absolute inset-0 m-auto h-10 w-10 text-primary animate-pulse" />
              </div>
              <p className="text-muted-foreground">Generating 3D model...</p>
              <p className="text-sm text-muted-foreground mt-1">This may take a minute</p>
            </div>
          ) : hasResult && modelUrl ? (
            <Suspense fallback={
              <div className="text-center">
                <Box className="h-16 w-16 text-muted-foreground mx-auto mb-4 animate-spin" />
                <p className="text-sm text-muted-foreground">Loading 3D viewer...</p>
              </div>
            }>
              <ThreeDViewer
                modelUrl={modelUrl}
                modelFormat={exportFormat as "glb" | "obj" | "fbx" | "stl"}
                lighting={lighting as "studio" | "outdoor" | "night"}
                autoRotate={isRotating}
                onLoad={() => console.log("3D model loaded")}
                onError={(error) => {
                  console.error("3D viewer error:", error);
                  toast.error("Failed to load 3D model");
                }}
              />
            </Suspense>
          ) : (
            <div className="text-center">
              <Box className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No 3D model yet</h3>
              <p className="text-muted-foreground text-sm max-w-md">
                Upload an image or enter a text prompt, then click Generate to create a 3D model
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
