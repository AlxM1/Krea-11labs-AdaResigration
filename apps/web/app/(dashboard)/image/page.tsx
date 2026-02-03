"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Sparkles,
  Settings2,
  Download,
  Heart,
  Share2,
  RefreshCw,
  ChevronDown,
  Image as ImageIcon,
  Dice5,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Select } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useGenerationStore } from "@/stores/generation-store";
import { imageModels, aspectRatios, stylePresets } from "@/lib/ai-models";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

export default function ImageGenerationPage() {
  const {
    params,
    setParams,
    isGenerating,
    setIsGenerating,
    generations,
    addGeneration,
  } = useGenerationStore();

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [selectedAspect, setSelectedAspect] = useState("1:1");
  const [selectedStyle, setSelectedStyle] = useState("none");

  const handleGenerate = async () => {
    if (!params.prompt.trim()) {
      toast.error("Please enter a prompt");
      return;
    }

    setIsGenerating(true);

    try {
      const response = await fetch("/api/generate/image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...params,
          prompt: selectedStyle !== "none"
            ? `${params.prompt}, ${stylePresets.find(s => s.id === selectedStyle)?.prompt}`
            : params.prompt,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Generation failed");
      }

      // Add to local state (in real app, poll for completion)
      addGeneration({
        id: data.id,
        prompt: params.prompt,
        imageUrl: "", // Will be updated when complete
        status: "processing",
        createdAt: new Date(),
        params,
      });

      toast.success("Generation started!");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Generation failed");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAspectChange = (aspectId: string) => {
    setSelectedAspect(aspectId);
    const aspect = aspectRatios.find((a) => a.id === aspectId);
    if (aspect) {
      setParams({ width: aspect.width, height: aspect.height });
    }
  };

  const randomizeSeed = () => {
    setParams({ seed: Math.floor(Math.random() * 2147483647) });
  };

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Left Panel - Generation Controls */}
      <div className="w-96 border-r border-border flex flex-col">
        <div className="p-4 border-b border-border">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            Image Generation
          </h1>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Prompt Input */}
          <div>
            <label className="text-sm font-medium mb-2 block">Prompt</label>
            <Textarea
              placeholder="Describe what you want to create..."
              value={params.prompt}
              onChange={(e) => setParams({ prompt: e.target.value })}
              className="min-h-[120px] resize-none"
            />
          </div>

          {/* Negative Prompt */}
          <div>
            <label className="text-sm font-medium mb-2 block">
              Negative Prompt{" "}
              <span className="text-muted-foreground font-normal">(optional)</span>
            </label>
            <Textarea
              placeholder="What to avoid in the image..."
              value={params.negativePrompt}
              onChange={(e) => setParams({ negativePrompt: e.target.value })}
              className="min-h-[60px] resize-none"
            />
          </div>

          {/* Model Selection */}
          <div>
            <label className="text-sm font-medium mb-2 block">Model</label>
            <Select
              value={params.model}
              onChange={(value) => {
                const model = imageModels.find((m) => m.id === value);
                setParams({
                  model: value,
                  steps: model?.defaultSteps || 4,
                });
              }}
              options={imageModels.map((model) => ({
                value: model.id,
                label: `${model.name} ${model.isPremium ? "(Pro)" : ""}`,
              }))}
            />
            <p className="text-xs text-muted-foreground mt-1">
              {imageModels.find((m) => m.id === params.model)?.description}
            </p>
          </div>

          {/* Aspect Ratio */}
          <div>
            <label className="text-sm font-medium mb-2 block">Aspect Ratio</label>
            <div className="flex flex-wrap gap-2">
              {aspectRatios.map((aspect) => (
                <button
                  key={aspect.id}
                  onClick={() => handleAspectChange(aspect.id)}
                  className={cn(
                    "px-3 py-1.5 text-sm rounded-lg border transition-colors",
                    selectedAspect === aspect.id
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border hover:border-primary/50"
                  )}
                >
                  {aspect.label}
                </button>
              ))}
            </div>
          </div>

          {/* Style Presets */}
          <div>
            <label className="text-sm font-medium mb-2 block">Style Preset</label>
            <Select
              value={selectedStyle}
              onChange={setSelectedStyle}
              options={stylePresets.map((style) => ({
                value: style.id,
                label: style.name,
              }))}
            />
          </div>

          {/* Advanced Settings */}
          <div>
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-2 text-sm font-medium mb-3 hover:text-primary transition-colors"
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
                exit={{ opacity: 0, height: 0 }}
                className="space-y-4"
              >
                <Slider
                  label="Steps"
                  value={params.steps}
                  onChange={(value) => setParams({ steps: value })}
                  min={1}
                  max={50}
                />

                <Slider
                  label="CFG Scale"
                  value={params.cfgScale}
                  onChange={(value) => setParams({ cfgScale: value })}
                  min={1}
                  max={20}
                  step={0.5}
                />

                <div>
                  <label className="text-sm font-medium mb-2 block">Seed</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={params.seed === -1 ? "" : params.seed}
                      onChange={(e) =>
                        setParams({
                          seed: e.target.value ? parseInt(e.target.value) : -1,
                        })
                      }
                      placeholder="Random"
                      className="flex-1 h-10 rounded-lg border border-input bg-background px-3 text-sm"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={randomizeSeed}
                    >
                      <Dice5 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Batch Size
                  </label>
                  <div className="flex gap-2">
                    {[1, 2, 4].map((size) => (
                      <button
                        key={size}
                        onClick={() => setParams({ batchSize: size })}
                        className={cn(
                          "flex-1 py-2 text-sm rounded-lg border transition-colors",
                          params.batchSize === size
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border hover:border-primary/50"
                        )}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>
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
            <Sparkles className="h-5 w-5" />
            Generate
          </Button>
          <p className="text-xs text-center text-muted-foreground mt-2">
            Uses {params.batchSize} credit{params.batchSize > 1 ? "s" : ""}
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
                  <div className="w-16 h-16 rounded-full border-4 border-primary border-t-transparent animate-spin mx-auto mb-4" />
                  <p className="text-muted-foreground">Generating your image...</p>
                </div>
              ) : generations.length > 0 && generations[0].imageUrl ? (
                <div className="relative max-w-2xl w-full">
                  <img
                    src={generations[0].imageUrl}
                    alt={generations[0].prompt}
                    className="w-full rounded-xl border border-border"
                  />
                  <div className="absolute bottom-4 right-4 flex gap-2">
                    <Button variant="secondary" size="icon">
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button variant="secondary" size="icon">
                      <Heart className="h-4 w-4" />
                    </Button>
                    <Button variant="secondary" size="icon">
                      <Share2 className="h-4 w-4" />
                    </Button>
                    <Button variant="secondary" size="icon">
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center">
                  <div className="w-32 h-32 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
                    <ImageIcon className="h-12 w-12 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">No image yet</h3>
                  <p className="text-muted-foreground max-w-md">
                    Enter a prompt and click Generate to create your first image
                  </p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="history" className="flex-1 p-4 overflow-y-auto">
            {generations.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {generations.map((gen) => (
                  <Card
                    key={gen.id}
                    className="group relative overflow-hidden cursor-pointer"
                  >
                    <div className="aspect-square bg-muted">
                      {gen.imageUrl ? (
                        <img
                          src={gen.imageUrl}
                          alt={gen.prompt}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          {gen.status === "processing" ? (
                            <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                          ) : (
                            <ImageIcon className="h-8 w-8 text-muted-foreground" />
                          )}
                        </div>
                      )}
                    </div>
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                      <p className="text-white text-sm line-clamp-2">
                        {gen.prompt}
                      </p>
                    </div>
                    {gen.status === "processing" && (
                      <Badge
                        variant="warning"
                        className="absolute top-2 right-2"
                      >
                        Processing
                      </Badge>
                    )}
                  </Card>
                ))}
              </div>
            ) : (
              <div className="h-full flex items-center justify-center">
                <div className="text-center">
                  <ImageIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    Your generation history will appear here
                  </p>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
