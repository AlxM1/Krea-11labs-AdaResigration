"use client";

import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  GraduationCap,
  Upload,
  X,
  Plus,
  Play,
  Clock,
  CheckCircle,
  AlertCircle,
  Image as ImageIcon,
  User,
  Palette,
  Package,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

const trainingTypes = [
  {
    id: "face",
    label: "Face / Person",
    icon: User,
    description: "Train on a specific person's face",
    imagesNeeded: "10-50 photos",
  },
  {
    id: "style",
    label: "Style",
    icon: Palette,
    description: "Train on an artistic style",
    imagesNeeded: "20-50 images",
  },
  {
    id: "product",
    label: "Product",
    icon: Package,
    description: "Train on product photography",
    imagesNeeded: "10-30 photos",
  },
  {
    id: "character",
    label: "Character",
    icon: Sparkles,
    description: "Consistent character design",
    imagesNeeded: "15-40 images",
  },
];

const baseModels = [
  { value: "flux-dev", label: "Flux Dev" },
  { value: "sdxl", label: "SDXL 1.0" },
  { value: "sd-1.5", label: "SD 1.5" },
];

interface UploadedImage {
  id: string;
  file: File;
  preview: string;
  caption?: string;
}

export default function TrainPage() {
  const [trainingType, setTrainingType] = useState("face");
  const [modelName, setModelName] = useState("");
  const [triggerWord, setTriggerWord] = useState("");
  const [baseModel, setBaseModel] = useState("flux-dev");
  const [trainingSteps, setTrainingSteps] = useState(1000);
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [isTraining, setIsTraining] = useState(false);
  const [trainingProgress, setTrainingProgress] = useState(0);

  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const newImages = files.map((file) => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      preview: URL.createObjectURL(file),
    }));
    setImages((prev) => [...prev, ...newImages].slice(0, 50));
  }, []);

  const removeImage = (id: string) => {
    setImages((prev) => {
      const img = prev.find((i) => i.id === id);
      if (img) URL.revokeObjectURL(img.preview);
      return prev.filter((i) => i.id !== id);
    });
  };

  const handleStartTraining = async () => {
    if (!modelName.trim()) {
      toast.error("Please enter a model name");
      return;
    }
    if (!triggerWord.trim()) {
      toast.error("Please enter a trigger word");
      return;
    }
    if (images.length < 5) {
      toast.error("Please upload at least 5 images");
      return;
    }

    setIsTraining(true);
    setTrainingProgress(0);

    // Simulate training progress
    const interval = setInterval(() => {
      setTrainingProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsTraining(false);
          toast.success("Model training complete!");
          return 100;
        }
        return prev + 2;
      });
    }, 200);
  };

  return (
    <div className="flex h-full">
      {/* Left Panel - Configuration */}
      <div className="w-96 border-r border-border flex flex-col">
        <div className="p-4 border-b border-border">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <GraduationCap className="h-5 w-5" />
            Train Custom Model
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Create your own LoRA model
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Training Type */}
          <div>
            <label className="text-sm font-medium mb-2 block">Training Type</label>
            <div className="grid grid-cols-2 gap-2">
              {trainingTypes.map((type) => (
                <button
                  key={type.id}
                  onClick={() => setTrainingType(type.id)}
                  className={cn(
                    "p-3 rounded-lg border text-left transition-colors",
                    trainingType === type.id
                      ? "border-primary bg-primary/10"
                      : "border-border hover:border-primary/50"
                  )}
                >
                  <type.icon className={cn(
                    "h-5 w-5 mb-1",
                    trainingType === type.id ? "text-primary" : "text-muted-foreground"
                  )} />
                  <div className="text-sm font-medium">{type.label}</div>
                  <div className="text-xs text-muted-foreground">{type.imagesNeeded}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Model Name */}
          <div>
            <label className="text-sm font-medium mb-2 block">Model Name</label>
            <Input
              placeholder="e.g., my-character-v1"
              value={modelName}
              onChange={(e) => setModelName(e.target.value)}
            />
          </div>

          {/* Trigger Word */}
          <div>
            <label className="text-sm font-medium mb-2 block">Trigger Word</label>
            <Input
              placeholder="e.g., ohwx person"
              value={triggerWord}
              onChange={(e) => setTriggerWord(e.target.value)}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Use this word in prompts to activate your model
            </p>
          </div>

          {/* Base Model */}
          <div>
            <label className="text-sm font-medium mb-2 block">Base Model</label>
            <Select
              value={baseModel}
              onChange={setBaseModel}
              options={baseModels}
            />
          </div>

          {/* Training Steps */}
          <Slider
            label="Training Steps"
            value={trainingSteps}
            onChange={setTrainingSteps}
            min={500}
            max={5000}
            step={100}
          />

          {/* Info */}
          <div className="p-3 rounded-lg bg-primary/10 border border-primary/20 text-sm">
            <p className="font-medium mb-1">Tips for best results:</p>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>- Use high-quality, varied images</li>
              <li>- Include different angles and lighting</li>
              <li>- Crop faces to be centered</li>
              <li>- Remove backgrounds if possible</li>
            </ul>
          </div>
        </div>

        {/* Action Button */}
        <div className="p-4 border-t border-border">
          <Button
            variant="gradient"
            className="w-full gap-2"
            size="lg"
            onClick={handleStartTraining}
            disabled={isTraining}
            isLoading={isTraining}
          >
            {isTraining ? (
              <>Training... {trainingProgress}%</>
            ) : (
              <>
                <Play className="h-5 w-5" />
                Start Training
              </>
            )}
          </Button>
          <p className="text-xs text-center text-muted-foreground mt-2">
            Training takes ~20-30 minutes
          </p>
        </div>
      </div>

      {/* Right Panel - Images */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="h-14 border-b border-border px-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="font-semibold">Training Images</h2>
            <Badge variant="outline">
              {images.length} / 50 images
            </Badge>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="file"
              id="train-upload"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleImageUpload}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => document.getElementById("train-upload")?.click()}
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload Images
            </Button>
          </div>
        </div>

        {/* Training Progress */}
        {isTraining && (
          <div className="px-4 py-3 bg-primary/5 border-b border-border">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                <GraduationCap className="h-4 w-4 text-primary animate-pulse" />
              </div>
              <div className="flex-1">
                <p className="font-medium">Training in progress...</p>
                <p className="text-sm text-muted-foreground">
                  Step {Math.floor(trainingSteps * trainingProgress / 100)} / {trainingSteps}
                </p>
              </div>
              <Badge variant="warning">
                <Clock className="h-3 w-3 mr-1" />
                ~{Math.ceil((100 - trainingProgress) / 5)} min remaining
              </Badge>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-primary"
                initial={{ width: 0 }}
                animate={{ width: `${trainingProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Images Grid */}
        <div className="flex-1 p-4 overflow-auto">
          {images.length === 0 ? (
            <div
              className="h-full border-2 border-dashed border-border rounded-xl flex items-center justify-center cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => document.getElementById("train-upload")?.click()}
            >
              <div className="text-center">
                <div className="w-20 h-20 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
                  <ImageIcon className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Upload training images</h3>
                <p className="text-muted-foreground text-sm mb-2">
                  Drag and drop or click to browse
                </p>
                <p className="text-xs text-muted-foreground">
                  Upload 10-50 images for best results
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
              {images.map((img) => (
                <div
                  key={img.id}
                  className="relative aspect-square rounded-lg overflow-hidden group"
                >
                  <img
                    src={img.preview}
                    alt="Training"
                    className="w-full h-full object-cover"
                  />
                  <button
                    onClick={() => removeImage(img.id)}
                    className="absolute top-1 right-1 p-1 rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}

              {/* Add more button */}
              <button
                onClick={() => document.getElementById("train-upload")?.click()}
                className="aspect-square rounded-lg border-2 border-dashed border-border flex items-center justify-center hover:border-primary/50 transition-colors"
              >
                <Plus className="h-8 w-8 text-muted-foreground" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
