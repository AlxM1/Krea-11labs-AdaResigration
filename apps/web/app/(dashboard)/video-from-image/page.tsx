"use client";

import { useState, useCallback } from "react";
import { Video, Upload, Play, Download, Sparkles, RefreshCw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Select } from "@/components/ui/select";
import { ShareButton } from "@/components/ui/share-button";
import { useModels } from "@/hooks/use-models";
import { useDropzone } from "react-dropzone";
import Image from "next/image";
import toast from "react-hot-toast";

export default function VideoFromImagePage() {
  const { models, bestModel } = useModels("image-to-video");

  const [prompt, setPrompt] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [selectedModel, setSelectedModel] = useState("");
  const [duration, setDuration] = useState(4);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [videoResult, setVideoResult] = useState<{
    id: string;
    videoUrl?: string;
    status: string;
  } | null>(null);

  // Auto-select best model
  if (bestModel && !selectedModel) {
    setSelectedModel(bestModel.id);
  }

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      setUploadedFile(file);
      const reader = new FileReader();
      reader.onload = () => {
        setImageUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
      setVideoResult(null);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [".png", ".jpg", ".jpeg", ".webp"] },
    maxFiles: 1,
  });

  const handleEnhancePrompt = async () => {
    if (!prompt.trim()) return;
    setIsEnhancing(true);
    try {
      const res = await fetch("/api/llm/enhance-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      const data = await res.json();
      if (data.enhanced) {
        setPrompt(data.enhanced);
        toast.success("Prompt enhanced!");
      }
    } catch {
      toast.error("Failed to enhance prompt");
    } finally {
      setIsEnhancing(false);
    }
  };

  const handleGenerate = async () => {
    if (!uploadedFile) {
      toast.error("Please upload an image first");
      return;
    }

    setIsGenerating(true);
    setVideoResult(null);

    try {
      // Step 1: Upload image to server
      const formData = new FormData();
      formData.append("file", uploadedFile);
      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const uploadData = await uploadRes.json();
      if (!uploadRes.ok || !uploadData.url) {
        toast.error(uploadData.error || "Failed to upload image");
        setIsGenerating(false);
        return;
      }

      // Step 2: Start video generation
      const res = await fetch("/api/generate/video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: prompt || "smooth cinematic motion, high quality",
          model: selectedModel,
          duration,
          imageUrl: uploadData.url,
          async: true,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.message || data.error || "Video generation failed", {
          duration: 8000,
        });
        setIsGenerating(false);
        return;
      }

      toast.success("Video generation started!");

      // Step 3: Poll for completion
      const jobId = data.id;
      const pollInterval = setInterval(async () => {
        try {
          const statusRes = await fetch(`/api/jobs/${jobId}`);
          const statusData = await statusRes.json();

          if (statusData.state === "completed" && statusData.returnvalue) {
            clearInterval(pollInterval);
            setVideoResult(statusData.returnvalue);
            setIsGenerating(false);
            toast.success("Video generated!");
          } else if (statusData.state === "failed") {
            clearInterval(pollInterval);
            setIsGenerating(false);
            toast.error(
              statusData.failedReason || "Video generation failed",
              { duration: 8000 }
            );
          }
        } catch {
          // Continue polling on transient errors
        }
      }, 3000);

      // Timeout after 40 minutes (Wan 2.2 14B MoE needs ~25min)
      setTimeout(() => {
        clearInterval(pollInterval);
        if (isGenerating) {
          setIsGenerating(false);
          toast.error("Video generation timed out");
        }
      }, 2400000);
    } catch (error) {
      toast.error("Failed to start video generation");
      setIsGenerating(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
          <Video className="h-8 w-8" />
          Image to Video
        </h1>
        <p className="text-gray-400">
          Animate your images into video with AI
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Controls */}
        <div className="space-y-6">
          <Card className="p-6 bg-gray-900 border-gray-800">
            <div className="space-y-4">
              {/* Image Upload */}
              <div>
                <Label>Source Image</Label>
                <div
                  {...getRootProps()}
                  className={`mt-2 border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition ${
                    isDragActive
                      ? "border-blue-500 bg-blue-500/10"
                      : "border-gray-700 hover:border-gray-600"
                  }`}
                >
                  <input {...getInputProps()} />
                  {imageUrl ? (
                    <div className="relative w-full h-48">
                      <Image
                        src={imageUrl}
                        alt="Source"
                        fill
                        className="object-contain"
                      />
                    </div>
                  ) : (
                    <div>
                      <Upload className="mx-auto h-12 w-12 text-gray-500 mb-4" />
                      <p className="text-gray-400">
                        {isDragActive
                          ? "Drop image here..."
                          : "Drag & drop or click to upload"}
                      </p>
                      <p className="text-xs text-gray-600 mt-2">
                        PNG, JPG, JPEG, WebP
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Motion Prompt */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Motion Prompt (optional)</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleEnhancePrompt}
                    disabled={!prompt.trim() || isEnhancing}
                    className="h-7 text-xs"
                  >
                    {isEnhancing ? (
                      <>
                        <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                        Enhancing...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-3 w-3 mr-1" />
                        Enhance
                      </>
                    )}
                  </Button>
                </div>
                <Textarea
                  placeholder="Describe how the image should animate... e.g., 'gentle camera zoom, hair blowing in wind'"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  rows={3}
                  className="bg-gray-950 border-gray-800"
                />
              </div>

              {/* Model Selection */}
              <div>
                <Label>Model</Label>
                <Select
                  value={selectedModel}
                  onChange={setSelectedModel}
                  options={models.map((m) => ({
                    value: m.id,
                    label: m.name,
                  }))}
                />
                <p className="text-xs text-gray-500 mt-1">
                  {models.find((m) => m.id === selectedModel)?.description}
                </p>
              </div>

              {/* Duration */}
              <div>
                <Slider
                  label="Duration (seconds)"
                  value={duration}
                  onChange={setDuration}
                  min={2}
                  max={6}
                />
              </div>

              <Button
                onClick={handleGenerate}
                disabled={!imageUrl || isGenerating}
                className="w-full gap-2"
                size="lg"
                variant="gradient"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Generating Video...
                  </>
                ) : (
                  <>
                    <Play className="h-5 w-5" />
                    Generate Video
                  </>
                )}
              </Button>
            </div>
          </Card>

          <Card className="p-4 bg-gray-900 border-gray-800">
            <h3 className="font-semibold mb-2">Tips</h3>
            <ul className="text-sm text-gray-400 space-y-1">
              <li>- Use clear, well-lit images for best results</li>
              <li>- Motion prompts guide the animation direction</li>
              <li>- Keep prompts short and descriptive</li>
              <li>- Generation takes 2-10 minutes depending on model</li>
            </ul>
          </Card>
        </div>

        {/* Output */}
        <div>
          <Card className="p-6 bg-gray-900 border-gray-800">
            <Label className="mb-4 block">Result</Label>
            <div className="aspect-video bg-gray-950 rounded-lg border border-gray-800 flex items-center justify-center overflow-hidden">
              {isGenerating ? (
                <div className="text-center">
                  <div className="relative w-20 h-20 mx-auto mb-4">
                    <div className="absolute inset-0 rounded-full border-4 border-primary/20" />
                    <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin" />
                  </div>
                  <p className="text-gray-400">Generating your video...</p>
                  <p className="text-sm text-gray-500 mt-1">
                    This may take a few minutes
                  </p>
                </div>
              ) : videoResult?.videoUrl ? (
                <video
                  src={videoResult.videoUrl}
                  controls
                  autoPlay
                  loop
                  className="w-full h-full rounded-lg"
                />
              ) : (
                <div className="text-center text-gray-500">
                  <Video className="h-12 w-12 mx-auto mb-4" />
                  <p>Upload an image to get started</p>
                </div>
              )}
            </div>

            {videoResult?.videoUrl && (
              <div className="flex gap-2 mt-4 justify-center">
                <a href={videoResult.videoUrl} download>
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                </a>
                <ShareButton
                  generationId={videoResult.id}
                  variant="default"
                  size="sm"
                />
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
