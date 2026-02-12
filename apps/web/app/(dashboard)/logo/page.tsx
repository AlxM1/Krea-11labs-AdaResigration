"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Hexagon,
  Sparkles,
  Download,
  RefreshCw,
  Type,
  Palette,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

const logoStyles = [
  { id: "minimalist", label: "Minimalist" },
  { id: "gradient", label: "Gradient" },
  { id: "3d", label: "3D" },
  { id: "vintage", label: "Vintage" },
  { id: "modern", label: "Modern" },
];

const colorPalettes = [
  { id: "blue", label: "Ocean", colors: ["#0EA5E9", "#2563EB", "#1E40AF"] },
  { id: "purple", label: "Royal", colors: ["#A855F7", "#7C3AED", "#5B21B6"] },
  { id: "green", label: "Nature", colors: ["#22C55E", "#16A34A", "#15803D"] },
  { id: "orange", label: "Sunset", colors: ["#F97316", "#EA580C", "#DC2626"] },
  { id: "gray", label: "Mono", colors: ["#F8FAFC", "#94A3B8", "#1E293B"] },
];

interface LogoResult {
  id: string;
  status: string;
  imageUrl?: string;
  error?: string;
  styleModifier?: string;
}

export default function LogoGenerationPage() {
  const [companyName, setCompanyName] = useState("");
  const [selectedStyle, setSelectedStyle] = useState("minimalist");
  const [selectedPalette, setSelectedPalette] = useState("blue");
  const [customColor, setCustomColor] = useState("#000000");
  const [useCustomColor, setUseCustomColor] = useState(false);
  const [count, setCount] = useState(4);
  const [isGenerating, setIsGenerating] = useState(false);
  const [results, setResults] = useState<LogoResult[]>([]);
  const [progress, setProgress] = useState(0);

  const getActiveColors = (): string[] => {
    if (useCustomColor) {
      return [customColor];
    }
    return (
      colorPalettes.find((p) => p.id === selectedPalette)?.colors || [
        "#0EA5E9",
      ]
    );
  };

  const handleGenerate = async () => {
    if (!companyName.trim()) {
      toast.error("Please enter a company name");
      return;
    }

    setIsGenerating(true);
    setResults([]);
    setProgress(0);

    try {
      const res = await fetch("/api/generate/logo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName: companyName.trim(),
          style: selectedStyle,
          colors: getActiveColors(),
          count,
          async: false,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Logo generation failed");
      }

      // API returns { results: [{id, status, imageUrl, styleModifier}, ...] }
      if (data.results && Array.isArray(data.results)) {
        const logos: LogoResult[] = data.results;
        setResults(logos);
        const completed = logos.filter((r: LogoResult) => r.status === "completed").length;
        if (completed > 0) {
          toast.success(`Generated ${completed} logo variation${completed > 1 ? "s" : ""}!`);
        } else {
          toast.error("All variations failed to generate");
        }
      } else {
        toast.error("No results returned");
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Logo generation failed"
      );
    } finally {
      setIsGenerating(false);
      setProgress(0);
    }
  };

  const handleDownload = (url: string, index: number) => {
    const a = document.createElement("a");
    a.href = url;
    a.download = `krya-logo-${companyName.toLowerCase().replace(/\s+/g, "-")}-${index + 1}-${Date.now()}.png`;
    a.click();
  };

  const completedResults = results.filter((r) => r.status === "completed" && r.imageUrl);

  return (
    <div className="flex h-[calc(100vh-3.5rem)]">
      {/* Left Panel - Controls */}
      <div className="w-96 border-r border-border flex flex-col">
        <div className="p-4 border-b border-border">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Hexagon className="h-5 w-5" />
            Logo Creator
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            AI-powered logo generation with 16 style variations
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Company Name */}
          <div>
            <label className="text-sm font-medium mb-2 block">
              <Type className="h-3.5 w-3.5 inline mr-1" />
              Company Name
            </label>
            <Input
              placeholder="Enter your company name..."
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
            />
          </div>

          {/* Style Selection */}
          <div>
            <label className="text-sm font-medium mb-2 block">Base Style</label>
            <div className="flex flex-wrap gap-2">
              {logoStyles.map((style) => (
                <button
                  key={style.id}
                  onClick={() => setSelectedStyle(style.id)}
                  className={cn(
                    "px-3 py-1.5 text-sm rounded-lg border transition-colors",
                    selectedStyle === style.id
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border hover:border-primary/50"
                  )}
                >
                  {style.label}
                </button>
              ))}
            </div>
          </div>

          {/* Color Palette */}
          <div>
            <label className="text-sm font-medium mb-2 block">
              <Palette className="h-3.5 w-3.5 inline mr-1" />
              Color Palette
            </label>
            <div className="space-y-3">
              <div className="grid grid-cols-5 gap-2">
                {colorPalettes.map((palette) => (
                  <button
                    key={palette.id}
                    onClick={() => {
                      setSelectedPalette(palette.id);
                      setUseCustomColor(false);
                    }}
                    className={cn(
                      "flex flex-col items-center gap-1 p-2 rounded-lg border transition-all",
                      !useCustomColor && selectedPalette === palette.id
                        ? "border-primary bg-primary/10 ring-1 ring-primary"
                        : "border-border hover:border-primary/50"
                    )}
                  >
                    <div className="flex gap-0.5">
                      {palette.colors.map((color, i) => (
                        <div
                          key={i}
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                    <span className="text-[10px] text-muted-foreground">
                      {palette.label}
                    </span>
                  </button>
                ))}
              </div>

              {/* Custom Color */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setUseCustomColor(!useCustomColor)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg border transition-colors",
                    useCustomColor
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border hover:border-primary/50"
                  )}
                >
                  Custom
                </button>
                {useCustomColor && (
                  <div className="flex items-center gap-2 flex-1">
                    <input
                      type="color"
                      value={customColor}
                      onChange={(e) => setCustomColor(e.target.value)}
                      className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent"
                    />
                    <Input
                      value={customColor}
                      onChange={(e) => setCustomColor(e.target.value)}
                      placeholder="#000000"
                      className="flex-1 h-8 text-sm font-mono"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Count Selector */}
          <div>
            <label className="text-sm font-medium mb-2 block">
              Variations
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[4, 8, 12, 16].map((num) => (
                <button
                  key={num}
                  onClick={() => setCount(num)}
                  className={cn(
                    "py-2 text-sm rounded-lg border transition-colors",
                    count === num
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border hover:border-primary/50"
                  )}
                >
                  {num}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Each variation uses a different style modifier
            </p>
          </div>
        </div>

        {/* Generate Button */}
        <div className="p-4 border-t border-border">
          <Button
            variant="gradient"
            className="w-full gap-2"
            size="lg"
            onClick={handleGenerate}
            disabled={!companyName.trim()}
            isLoading={isGenerating}
          >
            <Sparkles className="h-5 w-5" />
            Generate {count} Logos
          </Button>
          <p className="text-xs text-center text-muted-foreground mt-2">
            ~{count * 12}s estimated ({count} variations on local GPU)
          </p>
        </div>
      </div>

      {/* Right Panel - Output */}
      <div className="flex-1 flex flex-col">
        <div className="h-14 border-b border-border px-4 flex items-center justify-between shrink-0">
          <span className="font-medium">Results</span>
          {completedResults.length > 0 && (
            <div className="flex items-center gap-2">
              <Badge variant="success">
                {completedResults.length} logo{completedResults.length > 1 ? "s" : ""}
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setResults([])}
                className="text-muted-foreground"
              >
                <RefreshCw className="h-4 w-4 mr-1" />
                Clear
              </Button>
            </div>
          )}
        </div>

        <div className="flex-1 p-6 overflow-auto">
          {isGenerating ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <div className="relative w-20 h-20 mx-auto mb-4">
                  <div className="absolute inset-0 rounded-full border-4 border-primary/20" />
                  <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin" />
                </div>
                <p className="text-muted-foreground">
                  Generating {count} logo variations...
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Each variation uses a unique style. This may take a few minutes.
                </p>
              </div>
            </div>
          ) : results.length > 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
            >
              {results.map((result, index) => (
                <motion.div
                  key={result.id || index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                >
                  <Card className="group relative overflow-hidden">
                    <div className="aspect-square bg-white flex items-center justify-center p-4">
                      {result.status === "completed" && result.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={result.imageUrl}
                          alt=""
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <div className="text-center">
                          <Hexagon className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                          <p className="text-xs text-gray-400">
                            {result.error || "Failed"}
                          </p>
                        </div>
                      )}
                    </div>
                    {/* Style label */}
                    {result.styleModifier && (
                      <div className="absolute top-2 left-2">
                        <Badge variant="outline" className="bg-background/80 backdrop-blur-sm text-[10px]">
                          {result.styleModifier}
                        </Badge>
                      </div>
                    )}
                    {/* Variation number */}
                    <div className="absolute top-2 right-2">
                      <Badge variant="outline" className="bg-background/80 backdrop-blur-sm text-[10px]">
                        #{index + 1}
                      </Badge>
                    </div>
                    {/* Download overlay */}
                    {result.status === "completed" && result.imageUrl && (
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownload(result.imageUrl!, index)}
                          className="bg-background/80 backdrop-blur-sm"
                        >
                          <Download className="h-4 w-4 mr-1" />
                          Download
                        </Button>
                      </div>
                    )}
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <div className="w-32 h-32 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
                  <Hexagon className="h-12 w-12 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2">No logos yet</h3>
                <p className="text-muted-foreground max-w-md">
                  Enter your company name, choose a style and colors, then click
                  Generate to create up to 16 unique logo variations
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
