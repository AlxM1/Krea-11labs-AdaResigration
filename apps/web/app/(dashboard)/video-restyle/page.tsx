"use client";

import { useState } from "react";
import {
  Palette,
  Upload,
  Download,
  Video,
  Image as ImageIcon,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

const stylePresets = [
  { id: "anime", label: "Anime", preview: "bg-gradient-to-br from-pink-500 to-purple-600" },
  { id: "pixar", label: "Pixar", preview: "bg-gradient-to-br from-blue-500 to-cyan-400" },
  { id: "oil-paint", label: "Oil Paint", preview: "bg-gradient-to-br from-amber-500 to-orange-600" },
  { id: "watercolor", label: "Watercolor", preview: "bg-gradient-to-br from-teal-400 to-blue-500" },
  { id: "cyberpunk", label: "Cyberpunk", preview: "bg-gradient-to-br from-purple-600 to-pink-500" },
  { id: "vintage", label: "Vintage", preview: "bg-gradient-to-br from-amber-700 to-yellow-600" },
];

export default function VideoRestylePage() {
  const [videoFile, setVideoFile] = useState<string | null>(null);
  const [styleType, setStyleType] = useState<"preset" | "reference" | "prompt">("preset");
  const [selectedPreset, setSelectedPreset] = useState("anime");
  const [referenceImage, setReferenceImage] = useState<string | null>(null);
  const [stylePrompt, setStylePrompt] = useState("");
  const [styleStrength, setStyleStrength] = useState(75);
  const [temporalConsistency, setTemporalConsistency] = useState(80);
  const [isProcessing, setIsProcessing] = useState(false);
  const [hasResult, setHasResult] = useState(false);

  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setVideoFile(URL.createObjectURL(file));
    }
  };

  const handleReferenceUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setReferenceImage(URL.createObjectURL(file));
      setStyleType("reference");
    }
  };

  const handleProcess = async () => {
    if (!videoFile) {
      toast.error("Please upload a video");
      return;
    }

    setIsProcessing(true);
    await new Promise((resolve) => setTimeout(resolve, 5000));
    setIsProcessing(false);
    setHasResult(true);
    toast.success("Video restyle complete!");
  };

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Left Panel */}
      <div className="w-80 border-r border-border flex flex-col">
        <div className="p-4 border-b border-border">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Video Restyle
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Transform video style with AI
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Video Upload */}
          <div>
            <label className="text-sm font-medium mb-2 block">Source Video</label>
            <div
              className={cn(
                "border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors",
                videoFile ? "border-primary" : "border-border hover:border-primary/50"
              )}
              onClick={() => document.getElementById("restyle-video")?.click()}
            >
              {videoFile ? (
                <video src={videoFile} className="max-h-32 mx-auto rounded-lg" />
              ) : (
                <div className="py-4">
                  <Video className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Upload video</p>
                </div>
              )}
            </div>
            <input
              id="restyle-video"
              type="file"
              accept="video/*"
              className="hidden"
              onChange={handleVideoUpload}
            />
          </div>

          {/* Style Source */}
          <Tabs
            value={styleType}
            onValueChange={(value) => setStyleType(value as "preset" | "reference" | "prompt")}
            className="w-full"
          >
            <TabsList className="w-full">
              <TabsTrigger
                value="preset"
                className="flex-1"
              >
                Presets
              </TabsTrigger>
              <TabsTrigger
                value="reference"
                className="flex-1"
              >
                Reference
              </TabsTrigger>
              <TabsTrigger
                value="prompt"
                className="flex-1"
              >
                Prompt
              </TabsTrigger>
            </TabsList>

            <TabsContent value="preset" className="mt-4">
              <div className="grid grid-cols-3 gap-2">
                {stylePresets.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => setSelectedPreset(preset.id)}
                    className={cn(
                      "aspect-square rounded-lg flex items-center justify-center text-white text-xs font-medium transition-all",
                      preset.preview,
                      selectedPreset === preset.id
                        ? "ring-2 ring-primary ring-offset-2 ring-offset-background scale-105"
                        : "opacity-80 hover:opacity-100"
                    )}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="reference" className="mt-4">
              <div
                className={cn(
                  "border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors",
                  referenceImage ? "border-primary" : "border-border hover:border-primary/50"
                )}
                onClick={() => document.getElementById("style-ref")?.click()}
              >
                {referenceImage ? (
                  <img src={referenceImage} alt="Style" className="max-h-32 mx-auto rounded-lg" />
                ) : (
                  <div className="py-4">
                    <ImageIcon className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Upload style reference</p>
                  </div>
                )}
              </div>
              <input
                id="style-ref"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleReferenceUpload}
              />
            </TabsContent>

            <TabsContent value="prompt" className="mt-4">
              <Textarea
                placeholder="Describe the style you want..."
                value={stylePrompt}
                onChange={(e) => setStylePrompt(e.target.value)}
                className="min-h-[100px] resize-none"
              />
            </TabsContent>
          </Tabs>

          {/* Settings */}
          <Slider
            label="Style Strength"
            value={styleStrength}
            onChange={setStyleStrength}
            min={0}
            max={100}
          />

          <Slider
            label="Temporal Consistency"
            value={temporalConsistency}
            onChange={setTemporalConsistency}
            min={0}
            max={100}
          />
        </div>

        <div className="p-4 border-t border-border space-y-3">
          <Button
            variant="gradient"
            className="w-full gap-2"
            size="lg"
            onClick={handleProcess}
            disabled={!videoFile}
            isLoading={isProcessing}
          >
            <Sparkles className="h-5 w-5" />
            Restyle Video
          </Button>

          {hasResult && (
            <Button variant="outline" className="w-full gap-2">
              <Download className="h-4 w-4" />
              Download Result
            </Button>
          )}
        </div>
      </div>

      {/* Right Panel - Preview */}
      <div className="flex-1 flex flex-col">
        <div className="h-14 border-b border-border px-4 flex items-center justify-between">
          <span className="font-medium">Preview</span>
          {hasResult && <Badge variant="success">Complete</Badge>}
        </div>

        <div className="flex-1 bg-black flex items-center justify-center">
          {isProcessing ? (
            <div className="text-center">
              <div className="w-16 h-16 rounded-full border-4 border-primary border-t-transparent animate-spin mx-auto mb-4" />
              <p className="text-white">Restyling video...</p>
            </div>
          ) : videoFile ? (
            <video src={videoFile} className="max-h-[70vh] rounded-lg" controls />
          ) : (
            <div className="text-center text-muted-foreground">
              <Palette className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p>Upload a video to preview</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
