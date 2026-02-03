"use client";

import { useState } from "react";
import {
  Move,
  Upload,
  Play,
  Download,
  Video,
  Image as ImageIcon,
  Sparkles,
  Camera,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

export default function MotionTransferPage() {
  const [sourceVideo, setSourceVideo] = useState<string | null>(null);
  const [targetImage, setTargetImage] = useState<string | null>(null);
  const [motionSource, setMotionSource] = useState<"video" | "webcam">("video");
  const [isProcessing, setIsProcessing] = useState(false);
  const [hasResult, setHasResult] = useState(false);
  const [motionStrength, setMotionStrength] = useState(80);
  const [smoothness, setSmoothness] = useState(50);

  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSourceVideo(URL.createObjectURL(file));
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setTargetImage(URL.createObjectURL(file));
    }
  };

  const handleProcess = async () => {
    if (!sourceVideo || !targetImage) {
      toast.error("Please upload both source video and target image");
      return;
    }

    setIsProcessing(true);
    await new Promise((resolve) => setTimeout(resolve, 5000));
    setIsProcessing(false);
    setHasResult(true);
    toast.success("Motion transfer complete!");
  };

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Left Panel */}
      <div className="w-80 border-r border-border flex flex-col">
        <div className="p-4 border-b border-border">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Move className="h-5 w-5" />
            Motion Transfer
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Animate images with motion
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Motion Source Type */}
          <Tabs defaultValue="video" className="w-full">
            <TabsList className="w-full">
              <TabsTrigger
                value="video"
                className="flex-1"
                onClick={() => setMotionSource("video")}
              >
                <Video className="h-4 w-4 mr-1" />
                Video
              </TabsTrigger>
              <TabsTrigger
                value="webcam"
                className="flex-1"
                onClick={() => setMotionSource("webcam")}
              >
                <Camera className="h-4 w-4 mr-1" />
                Webcam
              </TabsTrigger>
            </TabsList>

            <TabsContent value="video" className="mt-4">
              <div
                className={cn(
                  "border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors",
                  sourceVideo ? "border-primary" : "border-border hover:border-primary/50"
                )}
                onClick={() => document.getElementById("motion-video")?.click()}
              >
                {sourceVideo ? (
                  <div className="flex items-center gap-3">
                    <Video className="h-8 w-8 text-primary" />
                    <span className="text-sm">Motion source uploaded</span>
                  </div>
                ) : (
                  <div className="py-4">
                    <Video className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Upload motion video</p>
                  </div>
                )}
              </div>
              <input
                id="motion-video"
                type="file"
                accept="video/*"
                className="hidden"
                onChange={handleVideoUpload}
              />
            </TabsContent>

            <TabsContent value="webcam" className="mt-4">
              <div className="border-2 border-dashed rounded-lg p-8 text-center">
                <Camera className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground mb-2">Use webcam as motion source</p>
                <Button variant="outline" size="sm">
                  Start Webcam
                </Button>
              </div>
            </TabsContent>
          </Tabs>

          {/* Target Image */}
          <div>
            <label className="text-sm font-medium mb-2 block">Target Image</label>
            <div
              className={cn(
                "border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors",
                targetImage ? "border-primary" : "border-border hover:border-primary/50"
              )}
              onClick={() => document.getElementById("target-image")?.click()}
            >
              {targetImage ? (
                <img
                  src={targetImage}
                  alt="Target"
                  className="max-h-32 mx-auto rounded-lg"
                />
              ) : (
                <div className="py-4">
                  <ImageIcon className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Upload image to animate</p>
                </div>
              )}
            </div>
            <input
              id="target-image"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageUpload}
            />
          </div>

          {/* Settings */}
          <Slider
            label="Motion Strength"
            value={motionStrength}
            onChange={setMotionStrength}
            min={0}
            max={100}
          />

          <Slider
            label="Smoothness"
            value={smoothness}
            onChange={setSmoothness}
            min={0}
            max={100}
          />

          {/* Info */}
          <div className="p-3 rounded-lg bg-muted/50 text-sm">
            <p className="font-medium mb-1">How it works:</p>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>1. Upload a video with motion/dance</li>
              <li>2. Upload an image to animate</li>
              <li>3. AI transfers the motion to your image</li>
            </ul>
          </div>
        </div>

        <div className="p-4 border-t border-border space-y-3">
          <Button
            variant="gradient"
            className="w-full gap-2"
            size="lg"
            onClick={handleProcess}
            disabled={!sourceVideo || !targetImage}
            isLoading={isProcessing}
          >
            <Sparkles className="h-5 w-5" />
            Transfer Motion
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

        <div className="flex-1 bg-black flex items-center justify-center gap-8 p-8">
          {isProcessing ? (
            <div className="text-center">
              <div className="w-16 h-16 rounded-full border-4 border-primary border-t-transparent animate-spin mx-auto mb-4" />
              <p className="text-white">Transferring motion...</p>
            </div>
          ) : (
            <>
              {/* Source */}
              <div className="text-center">
                <Badge variant="outline" className="mb-2">Motion Source</Badge>
                {sourceVideo ? (
                  <video src={sourceVideo} className="max-h-64 rounded-lg" controls muted loop />
                ) : (
                  <div className="w-48 h-48 rounded-lg bg-muted flex items-center justify-center">
                    <Video className="h-12 w-12 text-muted-foreground" />
                  </div>
                )}
              </div>

              {/* Arrow */}
              <Move className="h-8 w-8 text-primary" />

              {/* Target */}
              <div className="text-center">
                <Badge variant="outline" className="mb-2">Result</Badge>
                {targetImage ? (
                  <img src={targetImage} alt="Target" className="max-h-64 rounded-lg" />
                ) : (
                  <div className="w-48 h-48 rounded-lg bg-muted flex items-center justify-center">
                    <ImageIcon className="h-12 w-12 text-muted-foreground" />
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
