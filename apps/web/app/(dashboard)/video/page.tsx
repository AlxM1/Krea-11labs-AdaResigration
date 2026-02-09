"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Video,
  Play,
  Upload,
  Settings2,
  ChevronDown,
  Download,
  Clock,
  Sparkles,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { videoModels } from "@/lib/ai-models";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

export default function VideoGenerationPage() {
  const [prompt, setPrompt] = useState("");
  const [selectedModel, setSelectedModel] = useState("kling-2.5");
  const [duration, setDuration] = useState(5);
  const [aspectRatio, setAspectRatio] = useState("16:9");
  const [isGenerating, setIsGenerating] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [inputImage, setInputImage] = useState<string | null>(null);
  const [generationType, setGenerationType] = useState<"text" | "image">("text");
  const [videoResult, setVideoResult] = useState<{ id: string; videoUrl?: string; status: string } | null>(null);
  const [isEnhancing, setIsEnhancing] = useState(false);

  const handleEnhancePrompt = async () => {
    if (!prompt.trim()) return;

    setIsEnhancing(true);
    try {
      const response = await fetch('/api/llm/enhance-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });

      const data = await response.json();
      if (data.enhanced) {
        setPrompt(data.enhanced);
        toast.success('Prompt enhanced!');
      }
    } catch (error) {
      toast.error('Failed to enhance prompt');
    } finally {
      setIsEnhancing(false);
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim() && generationType === "text") {
      toast.error("Please enter a prompt");
      return;
    }

    setIsGenerating(true);
    setVideoResult(null);
    toast.success("Video generation started!");

    try {
      const res = await fetch("/api/generate/video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          model: selectedModel,
          duration,
          aspectRatio,
          imageUrl: generationType === "image" ? inputImage : undefined,
          async: true,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Video generation failed");
        setIsGenerating(false);
        return;
      }

      // Poll for completion
      const jobId = data.id;
      const pollInterval = setInterval(async () => {
        try {
          const statusRes = await fetch(`/api/jobs/${jobId}`);
          const statusData = await statusRes.json();

          if (statusData.status === "completed") {
            clearInterval(pollInterval);
            setVideoResult(statusData);
            setIsGenerating(false);
            toast.success("Video generated!");
          } else if (statusData.status === "failed") {
            clearInterval(pollInterval);
            setIsGenerating(false);
            toast.error("Video generation failed");
          }
        } catch {
          // Continue polling
        }
      }, 3000);

      // Timeout after 5 minutes
      setTimeout(() => {
        clearInterval(pollInterval);
        if (isGenerating) {
          setIsGenerating(false);
          toast.error("Video generation timed out");
        }
      }, 300000);
    } catch (error) {
      toast.error("Failed to start video generation");
      setIsGenerating(false);
    }
  };

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

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Left Panel - Controls */}
      <div className="w-96 border-r border-border flex flex-col">
        <div className="p-4 border-b border-border">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Video className="h-5 w-5" />
            Video Generation
          </h1>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Generation Type Tabs */}
          <Tabs
            value={generationType}
            onValueChange={(value) => setGenerationType(value as "text" | "image")}
            className="w-full"
          >
            <TabsList className="w-full">
              <TabsTrigger value="text" className="flex-1">
                Text to Video
              </TabsTrigger>
              <TabsTrigger value="image" className="flex-1">
                Image to Video
              </TabsTrigger>
            </TabsList>

            <TabsContent value="text" className="mt-4">
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium">Prompt</label>
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
                    placeholder="Describe the video you want to create..."
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    className="min-h-[120px] resize-none"
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="image" className="mt-4">
              <div className="space-y-4">
                {/* Image Upload */}
                <div>
                  <label className="text-sm font-medium mb-2 block">First Frame</label>
                  <div
                    className={cn(
                      "border-2 border-dashed border-border rounded-lg p-4 text-center cursor-pointer hover:border-primary/50 transition-colors",
                      inputImage && "border-primary"
                    )}
                    onClick={() => document.getElementById("image-upload")?.click()}
                  >
                    {inputImage ? (
                      <img
                        src={inputImage}
                        alt="Input"
                        className="max-h-40 mx-auto rounded-lg"
                      />
                    ) : (
                      <div className="py-8">
                        <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">
                          Click to upload or drag and drop
                        </p>
                      </div>
                    )}
                  </div>
                  <input
                    id="image-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageUpload}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Motion Prompt</label>
                  <Textarea
                    placeholder="Describe how the image should animate..."
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    className="min-h-[80px] resize-none"
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>

          {/* Model Selection */}
          <div>
            <label className="text-sm font-medium mb-2 block">Model</label>
            <Select
              value={selectedModel}
              onChange={setSelectedModel}
              options={videoModels.map((model) => ({
                value: model.id,
                label: `${model.name} (${model.resolution})`,
              }))}
            />
            <p className="text-xs text-muted-foreground mt-1">
              {videoModels.find((m) => m.id === selectedModel)?.description}
            </p>
          </div>

          {/* Duration */}
          <div>
            <Slider
              label="Duration (seconds)"
              value={duration}
              onChange={setDuration}
              min={2}
              max={videoModels.find((m) => m.id === selectedModel)?.maxDuration || 10}
            />
          </div>

          {/* Aspect Ratio */}
          <div>
            <label className="text-sm font-medium mb-2 block">Aspect Ratio</label>
            <div className="flex gap-2">
              {["16:9", "9:16", "1:1"].map((ratio) => (
                <button
                  key={ratio}
                  onClick={() => setAspectRatio(ratio)}
                  className={cn(
                    "flex-1 py-2 text-sm rounded-lg border transition-colors",
                    aspectRatio === ratio
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border hover:border-primary/50"
                  )}
                >
                  {ratio}
                </button>
              ))}
            </div>
          </div>

          {/* Advanced Settings */}
          <div>
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-2 text-sm font-medium hover:text-primary transition-colors"
            >
              <Settings2 className="h-4 w-4" />
              Advanced Settings
              <ChevronDown
                className={cn(
                  "h-4 w-4 transition-transform",
                  showAdvanced && "rotate-180"
                )}
              />
            </button>

            {showAdvanced && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="mt-4 space-y-4"
              >
                <Slider
                  label="Motion Intensity"
                  value={50}
                  onChange={() => {}}
                  min={0}
                  max={100}
                />
                <Slider
                  label="Camera Motion"
                  value={0}
                  onChange={() => {}}
                  min={0}
                  max={100}
                />
              </motion.div>
            )}
          </div>
        </div>

        {/* Generate Button */}
        <div className="p-4 border-t border-border">
          <Button
            variant="gradient"
            className="w-full gap-2"
            size="lg"
            onClick={handleGenerate}
            isLoading={isGenerating}
          >
            <Play className="h-5 w-5" />
            Generate Video
          </Button>
          <p className="text-xs text-center text-muted-foreground mt-2">
            Estimated time: ~{duration * 10}s | Uses {duration} credits
          </p>
        </div>
      </div>

      {/* Right Panel - Output */}
      <div className="flex-1 flex flex-col">
        <Tabs defaultValue="output" className="flex-1 flex flex-col">
          <div className="border-b border-border px-4">
            <TabsList>
              <TabsTrigger value="output">Output</TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="output" className="flex-1 p-4">
            <div className="h-full flex items-center justify-center">
              {isGenerating ? (
                <div className="text-center">
                  <div className="relative w-20 h-20 mx-auto mb-4">
                    <div className="absolute inset-0 rounded-full border-4 border-primary/20" />
                    <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin" />
                  </div>
                  <p className="text-muted-foreground">Generating your video...</p>
                  <p className="text-sm text-muted-foreground mt-1">This may take a few minutes</p>
                </div>
              ) : videoResult?.videoUrl ? (
                <div className="w-full max-w-2xl">
                  <video
                    src={videoResult.videoUrl}
                    controls
                    autoPlay
                    loop
                    className="w-full rounded-xl border border-border"
                  />
                  <div className="flex gap-2 mt-4 justify-center">
                    <a href={videoResult.videoUrl} download>
                      <Button variant="outline" size="sm">
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </Button>
                    </a>
                  </div>
                </div>
              ) : (
                <div className="text-center">
                  <div className="w-32 h-32 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
                    <Video className="h-12 w-12 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">No video yet</h3>
                  <p className="text-muted-foreground max-w-md">
                    Enter a prompt or upload an image, then click Generate to create your video
                  </p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="history" className="flex-1 p-4 overflow-y-auto">
            <div className="text-center py-12">
              <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Your video history will appear here</p>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
