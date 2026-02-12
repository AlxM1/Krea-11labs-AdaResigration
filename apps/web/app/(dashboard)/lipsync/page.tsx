"use client";

import { useState } from "react";
import {
  Mic,
  Upload,
  Play,
  Pause,
  Download,
  Video,
  Music,
  Sparkles,
  Volume2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

export default function LipsyncPage() {
  const [videoFile, setVideoFile] = useState<string | null>(null);
  const [audioFile, setAudioFile] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [hasResult, setHasResult] = useState(false);
  const [syncStrength, setSyncStrength] = useState(80);
  const [expressiveness, setExpressiveness] = useState(50);

  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setVideoFile(URL.createObjectURL(file));
    }
  };

  const handleAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAudioFile(URL.createObjectURL(file));
    }
  };

  const handleProcess = async () => {
    if (!videoFile || !audioFile) {
      toast.error("Please upload both video and audio files");
      return;
    }

    setIsProcessing(true);
    await new Promise((resolve) => setTimeout(resolve, 5000));
    setIsProcessing(false);
    setHasResult(true);
    toast.success("Lipsync complete!");
  };

  return (
    <div className="flex h-[calc(100vh-3.5rem)]">
      {/* Left Panel */}
      <div className="w-80 border-r border-border flex flex-col">
        <div className="p-4 border-b border-border">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Mic className="h-5 w-5" />
            Video Lipsync
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Sync video to any audio
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
              onClick={() => document.getElementById("video-upload")?.click()}
            >
              {videoFile ? (
                <div className="flex items-center gap-3">
                  <Video className="h-8 w-8 text-primary" />
                  <span className="text-sm">Video uploaded</span>
                </div>
              ) : (
                <div className="py-4">
                  <Video className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Upload video</p>
                </div>
              )}
            </div>
            <input
              id="video-upload"
              type="file"
              accept="video/*"
              className="hidden"
              onChange={handleVideoUpload}
            />
          </div>

          {/* Audio Upload */}
          <div>
            <label className="text-sm font-medium mb-2 block">Audio Track</label>
            <div
              className={cn(
                "border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors",
                audioFile ? "border-primary" : "border-border hover:border-primary/50"
              )}
              onClick={() => document.getElementById("audio-upload")?.click()}
            >
              {audioFile ? (
                <div className="flex items-center gap-3">
                  <Music className="h-8 w-8 text-primary" />
                  <span className="text-sm">Audio uploaded</span>
                </div>
              ) : (
                <div className="py-4">
                  <Music className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Upload audio (MP3, WAV)</p>
                </div>
              )}
            </div>
            <input
              id="audio-upload"
              type="file"
              accept="audio/*"
              className="hidden"
              onChange={handleAudioUpload}
            />
          </div>

          {/* Settings */}
          <Slider
            label="Sync Strength"
            value={syncStrength}
            onChange={setSyncStrength}
            min={0}
            max={100}
          />

          <Slider
            label="Expressiveness"
            value={expressiveness}
            onChange={setExpressiveness}
            min={0}
            max={100}
          />

          {/* Info */}
          <div className="p-3 rounded-lg bg-muted/50 text-sm">
            <p className="font-medium mb-1">Tips:</p>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>- Video should clearly show the face</li>
              <li>- Works best with clear speech audio</li>
              <li>- Supports multiple languages</li>
            </ul>
          </div>
        </div>

        <div className="p-4 border-t border-border space-y-3">
          <Button
            variant="gradient"
            className="w-full gap-2"
            size="lg"
            onClick={handleProcess}
            disabled={!videoFile || !audioFile}
            isLoading={isProcessing}
          >
            <Sparkles className="h-5 w-5" />
            Generate Lipsync
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
              <p className="text-white">Processing lipsync...</p>
            </div>
          ) : videoFile ? (
            <video
              src={videoFile}
              className="max-h-[70vh] rounded-lg"
              controls
            />
          ) : (
            <div className="text-center text-muted-foreground">
              <Mic className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p>Upload video and audio to preview</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
