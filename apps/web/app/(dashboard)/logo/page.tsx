"use client";

import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Hexagon,
  Sparkles,
  Download,
  RefreshCw,
  Type,
  Palette,
  Image,
  Shield,
  Cat,
  Minus,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

// --- Config data (mirrors server config for UI) ---

const LOGO_TYPES = [
  { id: "icon-text", label: "Icon + Text", icon: Type, description: "Icon with company name" },
  { id: "text-only", label: "Text Only", icon: Minus, description: "Stylized text logo" },
  { id: "icon-only", label: "Icon Only", icon: Image, description: "Symbol or icon mark" },
  { id: "emblem", label: "Emblem", icon: Shield, description: "Badge/shield style" },
  { id: "mascot", label: "Mascot", icon: Cat, description: "Character-based" },
] as const;

const VISUAL_STYLES = [
  { id: "minimalist", label: "Minimalist" },
  { id: "bold", label: "Bold" },
  { id: "vintage", label: "Vintage" },
  { id: "modern", label: "Modern" },
  { id: "geometric", label: "Geometric" },
  { id: "hand-drawn", label: "Hand Drawn" },
  { id: "gradient", label: "Gradient" },
  { id: "monochrome", label: "Monochrome" },
  { id: "emblem", label: "Emblem" },
  { id: "wordmark", label: "Wordmark" },
  { id: "mascot", label: "Mascot" },
  { id: "abstract", label: "Abstract" },
  { id: "line-art", label: "Line Art" },
  { id: "3d", label: "3D" },
  { id: "flat", label: "Flat" },
  { id: "luxurious", label: "Luxurious" },
  { id: "tech", label: "Tech" },
  { id: "organic", label: "Organic" },
  { id: "neon", label: "Neon" },
  { id: "watercolor", label: "Watercolor" },
];

const INDUSTRY_PRESETS = [
  { id: "", label: "None" },
  { id: "technology", label: "Technology" },
  { id: "food", label: "Food & Drink" },
  { id: "health", label: "Health & Wellness" },
  { id: "finance", label: "Finance" },
  { id: "education", label: "Education" },
  { id: "fashion", label: "Fashion" },
  { id: "sports", label: "Sports" },
  { id: "music", label: "Music" },
  { id: "travel", label: "Travel" },
  { id: "real-estate", label: "Real Estate" },
  { id: "legal", label: "Legal" },
  { id: "automotive", label: "Automotive" },
  { id: "gaming", label: "Gaming" },
  { id: "beauty", label: "Beauty" },
];

const FONT_STYLES = [
  { id: "sans-serif", label: "Sans Serif", fontClass: "font-sans" },
  { id: "serif", label: "Serif", fontClass: "font-serif" },
  { id: "script", label: "Script", fontClass: "italic" },
  { id: "bold", label: "Bold", fontClass: "font-sans font-bold" },
  { id: "monospace", label: "Mono", fontClass: "font-mono" },
];

const COLOR_PALETTES = [
  { id: "ocean", label: "Ocean", colors: ["#0EA5E9", "#2563EB", "#1E40AF"] },
  { id: "royal", label: "Royal", colors: ["#A855F7", "#7C3AED", "#5B21B6"] },
  { id: "nature", label: "Nature", colors: ["#22C55E", "#16A34A", "#15803D"] },
  { id: "sunset", label: "Sunset", colors: ["#F97316", "#EA580C", "#DC2626"] },
  { id: "mono", label: "Mono", colors: ["#F8FAFC", "#94A3B8", "#1E293B"] },
  { id: "rose", label: "Rose", colors: ["#FB7185", "#E11D48", "#9F1239"] },
  { id: "teal", label: "Teal", colors: ["#2DD4BF", "#14B8A6", "#0D9488"] },
  { id: "amber", label: "Amber", colors: ["#FBBF24", "#F59E0B", "#D97706"] },
  { id: "indigo", label: "Indigo", colors: ["#818CF8", "#6366F1", "#4338CA"] },
  { id: "emerald", label: "Emerald", colors: ["#34D399", "#10B981", "#059669"] },
  { id: "crimson", label: "Crimson", colors: ["#EF4444", "#DC2626", "#991B1B"] },
  { id: "lavender", label: "Lavender", colors: ["#C4B5FD", "#A78BFA", "#7C3AED"] },
  { id: "slate", label: "Slate", colors: ["#CBD5E1", "#64748B", "#334155"] },
  { id: "coral", label: "Coral", colors: ["#FB923C", "#F472B6", "#E879F9"] },
  { id: "mint", label: "Mint", colors: ["#A7F3D0", "#6EE7B7", "#34D399"] },
  { id: "gold", label: "Gold", colors: ["#FDE68A", "#F59E0B", "#B45309"] },
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
  const [logoType, setLogoType] = useState("icon-text");
  const [visualStyle, setVisualStyle] = useState("minimalist");
  const [industry, setIndustry] = useState("");
  const [fontStyle, setFontStyle] = useState("sans-serif");
  const [fontColor, setFontColor] = useState("#1E293B");
  const [textPosition, setTextPosition] = useState<"below" | "right">("below");
  const [selectedPalette, setSelectedPalette] = useState("ocean");
  const [customColor, setCustomColor] = useState("#000000");
  const [useCustomColor, setUseCustomColor] = useState(false);
  const [count, setCount] = useState(4);
  const [isGenerating, setIsGenerating] = useState(false);
  const [results, setResults] = useState<LogoResult[]>([]);
  const [completedCount, setCompletedCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  const logoTypeHasText = logoType !== "icon-only";
  const logoTypeHasIcon = logoType !== "text-only";

  const getActiveColors = (): string[] => {
    if (useCustomColor) return [customColor];
    return COLOR_PALETTES.find((p) => p.id === selectedPalette)?.colors || ["#0EA5E9"];
  };

  const handleGenerate = useCallback(async () => {
    if (!companyName.trim()) {
      toast.error("Please enter a company name");
      return;
    }

    setIsGenerating(true);
    setResults([]);
    setCompletedCount(0);
    setTotalCount(count);

    try {
      const res = await fetch("/api/generate/logo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName: companyName.trim(),
          logoType,
          visualStyle,
          industry: industry || null,
          fontStyle,
          fontColor,
          textPosition: logoType === "emblem" ? "emblem-arc" : textPosition,
          colors: getActiveColors(),
          count,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Logo generation failed");
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response stream");

      const decoder = new TextDecoder();
      let buffer = "";
      let completed = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const result: LogoResult = JSON.parse(line);
            setResults((prev) => [...prev, result]);
            if (result.status === "completed") {
              completed++;
              setCompletedCount(completed);
            }
          } catch {
            console.warn("[Logo] Failed to parse stream line:", line);
          }
        }
      }

      if (buffer.trim()) {
        try {
          const result: LogoResult = JSON.parse(buffer);
          setResults((prev) => [...prev, result]);
          if (result.status === "completed") {
            completed++;
            setCompletedCount(completed);
          }
        } catch {
          console.warn("[Logo] Failed to parse final buffer:", buffer);
        }
      }

      if (completed > 0) {
        toast.success(`Generated ${completed} logo variation${completed > 1 ? "s" : ""}!`);
      } else {
        toast.error("All variations failed to generate");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Logo generation failed");
    } finally {
      setIsGenerating(false);
    }
  }, [companyName, logoType, visualStyle, industry, fontStyle, fontColor, textPosition, selectedPalette, customColor, useCustomColor, count]);

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
            AI-powered logo generation with text compositing
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-5">
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

          {/* Logo Type */}
          <div>
            <label className="text-sm font-medium mb-2 block">Logo Type</label>
            <div className="grid grid-cols-5 gap-1.5">
              {LOGO_TYPES.map((type) => {
                const Icon = type.icon;
                return (
                  <button
                    key={type.id}
                    onClick={() => setLogoType(type.id)}
                    title={type.description}
                    className={cn(
                      "flex flex-col items-center gap-1 p-2 rounded-lg border transition-all text-center",
                      logoType === type.id
                        ? "border-primary bg-primary/10 text-primary ring-1 ring-primary"
                        : "border-border hover:border-primary/50"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="text-[10px] leading-tight">{type.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Visual Style */}
          <div>
            <label className="text-sm font-medium mb-2 block">Visual Style</label>
            <div className="relative">
              <select
                value={visualStyle}
                onChange={(e) => setVisualStyle(e.target.value)}
                className="w-full h-9 px-3 pr-8 rounded-lg border border-border bg-background text-sm appearance-none cursor-pointer hover:border-primary/50 focus:border-primary focus:ring-1 focus:ring-primary outline-none"
              >
                {VISUAL_STYLES.map((style) => (
                  <option key={style.id} value={style.id}>
                    {style.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="h-4 w-4 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground" />
            </div>
          </div>

          {/* Industry Preset */}
          <div>
            <label className="text-sm font-medium mb-2 block">Industry</label>
            <div className="relative">
              <select
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                className="w-full h-9 px-3 pr-8 rounded-lg border border-border bg-background text-sm appearance-none cursor-pointer hover:border-primary/50 focus:border-primary focus:ring-1 focus:ring-primary outline-none"
              >
                {INDUSTRY_PRESETS.map((preset) => (
                  <option key={preset.id} value={preset.id}>
                    {preset.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="h-4 w-4 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground" />
            </div>
          </div>

          {/* Font Style - only show if logo type has text */}
          {logoTypeHasText && (
            <div>
              <label className="text-sm font-medium mb-2 block">Font Style</label>
              <div className="grid grid-cols-5 gap-1.5">
                {FONT_STYLES.map((font) => (
                  <button
                    key={font.id}
                    onClick={() => setFontStyle(font.id)}
                    className={cn(
                      "p-2 rounded-lg border transition-all text-center",
                      fontStyle === font.id
                        ? "border-primary bg-primary/10 text-primary ring-1 ring-primary"
                        : "border-border hover:border-primary/50"
                    )}
                  >
                    <span className={cn("text-xs", font.fontClass)}>{font.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Font Color - only show if logo type has text */}
          {logoTypeHasText && (
            <div>
              <label className="text-sm font-medium mb-2 block">Text Color</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={fontColor}
                  onChange={(e) => setFontColor(e.target.value)}
                  className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent"
                />
                <Input
                  value={fontColor}
                  onChange={(e) => setFontColor(e.target.value)}
                  placeholder="#1E293B"
                  className="flex-1 h-8 text-sm font-mono"
                />
              </div>
            </div>
          )}

          {/* Text Position - only for icon-text and mascot */}
          {logoTypeHasText && logoTypeHasIcon && logoType !== "emblem" && (
            <div>
              <label className="text-sm font-medium mb-2 block">Text Position</label>
              <div className="grid grid-cols-2 gap-2">
                {(["below", "right"] as const).map((pos) => (
                  <button
                    key={pos}
                    onClick={() => setTextPosition(pos)}
                    className={cn(
                      "py-2 text-sm rounded-lg border transition-colors capitalize",
                      textPosition === pos
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border hover:border-primary/50"
                    )}
                  >
                    {pos}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Color Palette */}
          <div>
            <label className="text-sm font-medium mb-2 block">
              <Palette className="h-3.5 w-3.5 inline mr-1" />
              Color Palette
            </label>
            <div className="space-y-3">
              <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto pr-1">
                {COLOR_PALETTES.map((palette) => (
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
            <label className="text-sm font-medium mb-2 block">Variations</label>
            <div className="grid grid-cols-3 gap-2">
              {[4, 8, 16].map((num) => (
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
              Each variation uses a different visual style
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
            disabled={!companyName.trim() || isGenerating}
            isLoading={isGenerating}
          >
            <Sparkles className="h-5 w-5" />
            Generate {count} Logos
          </Button>
          {isGenerating && totalCount > 0 ? (
            <p className="text-xs text-center text-muted-foreground mt-2">
              {results.length} of {totalCount} completed
            </p>
          ) : (
            <p className="text-xs text-center text-muted-foreground mt-2">
              {logoType === "text-only"
                ? `~${Math.max(1, Math.floor(count * 0.5))}s estimated (text rendering)`
                : `~${count * 12}s estimated (${count} variations on local GPU)`}
            </p>
          )}
        </div>
      </div>

      {/* Right Panel - Output */}
      <div className="flex-1 flex flex-col">
        <div className="h-14 border-b border-border px-4 flex items-center justify-between shrink-0">
          <span className="font-medium">Results</span>
          {results.length > 0 && (
            <div className="flex items-center gap-2">
              <Badge variant={isGenerating ? "default" : "success"}>
                {completedResults.length} logo{completedResults.length !== 1 ? "s" : ""}
                {isGenerating && ` / ${totalCount}`}
              </Badge>
              {!isGenerating && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setResults([]);
                    setCompletedCount(0);
                  }}
                  className="text-muted-foreground"
                >
                  <RefreshCw className="h-4 w-4 mr-1" />
                  Clear
                </Button>
              )}
            </div>
          )}
        </div>

        <div className="flex-1 p-6 overflow-auto">
          {results.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {results.map((result, index) => (
                <motion.div
                  key={result.id || index}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3 }}
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
                    {result.styleModifier && (
                      <div className="absolute top-2 left-2">
                        <Badge variant="outline" className="bg-background/80 backdrop-blur-sm text-[10px]">
                          {result.styleModifier}
                        </Badge>
                      </div>
                    )}
                    <div className="absolute top-2 right-2">
                      <Badge variant="outline" className="bg-background/80 backdrop-blur-sm text-[10px]">
                        #{index + 1}
                      </Badge>
                    </div>
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

              {isGenerating && Array.from({ length: totalCount - results.length }).map((_, i) => (
                <div key={`pending-${i}`} className="animate-pulse">
                  <Card className="overflow-hidden">
                    <div className="aspect-square bg-muted flex items-center justify-center">
                      <div className="text-center">
                        <div className="w-8 h-8 rounded-full border-2 border-primary/30 border-t-primary animate-spin mx-auto mb-2" />
                        <p className="text-xs text-muted-foreground">
                          Generating...
                        </p>
                      </div>
                    </div>
                  </Card>
                </div>
              ))}
            </div>
          ) : isGenerating ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {Array.from({ length: totalCount }).map((_, i) => (
                <div key={`pending-${i}`} className="animate-pulse">
                  <Card className="overflow-hidden">
                    <div className="aspect-square bg-muted flex items-center justify-center">
                      <div className="text-center">
                        <div className="w-8 h-8 rounded-full border-2 border-primary/30 border-t-primary animate-spin mx-auto mb-2" />
                        <p className="text-xs text-muted-foreground">
                          Waiting...
                        </p>
                      </div>
                    </div>
                  </Card>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <div className="w-32 h-32 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
                  <Hexagon className="h-12 w-12 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2">No logos yet</h3>
                <p className="text-muted-foreground max-w-md">
                  Enter your company name, choose a type and style, then click
                  Generate to create unique logo variations with text compositing
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
