// Logo generation configuration: types, styles, industries, palettes, fonts, and prompt building

export type LogoType = "icon-text" | "text-only" | "icon-only" | "emblem" | "mascot";
export type TextPosition = "below" | "right" | "emblem-arc";

export interface LogoTypeOption {
  id: LogoType;
  label: string;
  description: string;
  hasIcon: boolean;
  hasText: boolean;
}

export const LOGO_TYPES: LogoTypeOption[] = [
  { id: "icon-text", label: "Icon + Text", description: "Icon with company name", hasIcon: true, hasText: true },
  { id: "text-only", label: "Text Only", description: "Stylized text logo", hasIcon: false, hasText: true },
  { id: "icon-only", label: "Icon Only", description: "Symbol or icon mark", hasIcon: true, hasText: false },
  { id: "emblem", label: "Emblem", description: "Icon enclosed in badge/shield", hasIcon: true, hasText: true },
  { id: "mascot", label: "Mascot", description: "Character-based logo", hasIcon: true, hasText: true },
];

export interface VisualStyle {
  id: string;
  label: string;
  promptFragment: string;
}

export const VISUAL_STYLES: VisualStyle[] = [
  { id: "minimalist", label: "Minimalist", promptFragment: "minimalist, clean, simple shapes, whitespace" },
  { id: "bold", label: "Bold", promptFragment: "bold, strong lines, impactful, high contrast" },
  { id: "vintage", label: "Vintage", promptFragment: "vintage, retro, weathered texture, classic typography feel" },
  { id: "modern", label: "Modern", promptFragment: "modern, sleek, contemporary, sharp edges" },
  { id: "geometric", label: "Geometric", promptFragment: "geometric shapes, polygons, mathematical precision" },
  { id: "hand-drawn", label: "Hand Drawn", promptFragment: "hand-drawn, sketchy, organic lines, artistic" },
  { id: "gradient", label: "Gradient", promptFragment: "smooth gradient, color transitions, vibrant" },
  { id: "monochrome", label: "Monochrome", promptFragment: "monochrome, single color, black and white" },
  { id: "emblem", label: "Emblem", promptFragment: "emblem style, badge, crest, enclosed design" },
  { id: "wordmark", label: "Wordmark", promptFragment: "wordmark inspired, typographic, lettering-inspired shapes" },
  { id: "mascot", label: "Mascot", promptFragment: "mascot character, friendly, cartoon style, expressive" },
  { id: "abstract", label: "Abstract", promptFragment: "abstract, non-representational, artistic, fluid" },
  { id: "line-art", label: "Line Art", promptFragment: "line art, thin strokes, outline only, elegant" },
  { id: "3d", label: "3D", promptFragment: "3D render, depth, shadows, perspective, glossy" },
  { id: "flat", label: "Flat", promptFragment: "flat design, no shadows, solid colors, 2D" },
  { id: "luxurious", label: "Luxurious", promptFragment: "luxurious, premium, gold accents, elegant, sophisticated" },
  { id: "tech", label: "Tech", promptFragment: "tech style, digital, circuit-inspired, futuristic" },
  { id: "organic", label: "Organic", promptFragment: "organic, natural, flowing curves, leaf-like" },
  { id: "neon", label: "Neon", promptFragment: "neon glow, bright colors, dark background, electric" },
  { id: "watercolor", label: "Watercolor", promptFragment: "watercolor, soft edges, painted, artistic bleed" },
];

export interface IndustryPreset {
  id: string;
  label: string;
  promptFragment: string;
  suggestedStyles: string[];
}

export const INDUSTRY_PRESETS: IndustryPreset[] = [
  { id: "technology", label: "Technology", promptFragment: "technology company, digital, innovation", suggestedStyles: ["tech", "modern", "geometric"] },
  { id: "food", label: "Food & Drink", promptFragment: "food and beverage, culinary, appetizing", suggestedStyles: ["organic", "hand-drawn", "vintage"] },
  { id: "health", label: "Health & Wellness", promptFragment: "health, wellness, medical, care", suggestedStyles: ["minimalist", "organic", "modern"] },
  { id: "finance", label: "Finance", promptFragment: "finance, banking, trust, stability", suggestedStyles: ["minimalist", "bold", "luxurious"] },
  { id: "education", label: "Education", promptFragment: "education, learning, knowledge, academic", suggestedStyles: ["modern", "flat", "geometric"] },
  { id: "fashion", label: "Fashion", promptFragment: "fashion, style, clothing, luxury", suggestedStyles: ["luxurious", "minimalist", "bold"] },
  { id: "sports", label: "Sports", promptFragment: "sports, athletic, energy, dynamic", suggestedStyles: ["bold", "3d", "mascot"] },
  { id: "music", label: "Music", promptFragment: "music, audio, sound, rhythm", suggestedStyles: ["neon", "abstract", "gradient"] },
  { id: "travel", label: "Travel", promptFragment: "travel, adventure, exploration, destinations", suggestedStyles: ["watercolor", "line-art", "vintage"] },
  { id: "real-estate", label: "Real Estate", promptFragment: "real estate, property, home, architecture", suggestedStyles: ["modern", "minimalist", "luxurious"] },
  { id: "legal", label: "Legal", promptFragment: "legal, law, justice, professional", suggestedStyles: ["emblem", "bold", "minimalist"] },
  { id: "automotive", label: "Automotive", promptFragment: "automotive, car, vehicle, speed", suggestedStyles: ["bold", "3d", "modern"] },
  { id: "gaming", label: "Gaming", promptFragment: "gaming, esports, playful, interactive", suggestedStyles: ["neon", "3d", "mascot"] },
  { id: "beauty", label: "Beauty", promptFragment: "beauty, cosmetics, skincare, elegance", suggestedStyles: ["gradient", "organic", "luxurious"] },
];

export interface ColorPalette {
  id: string;
  label: string;
  colors: string[];
}

export const COLOR_PALETTES: ColorPalette[] = [
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
  { id: "custom", label: "Custom", colors: [] },
];

export interface FontStyle {
  id: string;
  label: string;
  fontFamily: string;
  fallback: string;
  fontWeight: string;
}

export const FONT_STYLES: FontStyle[] = [
  { id: "sans-serif", label: "Sans Serif", fontFamily: "Inter", fallback: "DejaVu Sans", fontWeight: "600" },
  { id: "serif", label: "Serif", fontFamily: "Playfair Display", fallback: "DejaVu Serif", fontWeight: "700" },
  { id: "script", label: "Script", fontFamily: "Dancing Script", fallback: "DejaVu Sans", fontWeight: "400" },
  { id: "bold", label: "Bold", fontFamily: "Oswald", fallback: "DejaVu Sans", fontWeight: "700" },
  { id: "monospace", label: "Monospace", fontFamily: "JetBrains Mono", fallback: "DejaVu Sans Mono", fontWeight: "500" },
];

export interface LogoConfig {
  companyName: string;
  logoType: LogoType;
  visualStyle: string;
  industry: string | null;
  colors: string[];
  fontStyle: string;
  fontColor: string;
  textPosition: TextPosition;
}

export interface VariationPlan {
  index: number;
  visualStyle: string;
  promptFragment: string;
  seed: number;
}

export function buildLogoPrompt(config: LogoConfig, variationStyle?: string): string {
  const style = variationStyle
    ? VISUAL_STYLES.find((s) => s.id === variationStyle)
    : VISUAL_STYLES.find((s) => s.id === config.visualStyle);

  const styleFragment = style?.promptFragment || "clean, professional";
  const industry = config.industry ? INDUSTRY_PRESETS.find((i) => i.id === config.industry) : null;
  const industryFragment = industry ? `, ${industry.promptFragment}` : "";
  const colorStr = config.colors.length > 0 ? `, using colors: ${config.colors.join(", ")}` : "";

  const logoTypeMap: Record<LogoType, string> = {
    "icon-text": "professional icon logo design, symbol mark",
    "text-only": "professional logo design",
    "icon-only": "professional icon logo design, symbol mark, standalone icon",
    "emblem": "professional emblem logo design, badge style, crest, enclosed circular design",
    "mascot": "professional mascot logo design, character illustration, friendly mascot",
  };

  const baseType = logoTypeMap[config.logoType] || logoTypeMap["icon-text"];

  return `${baseType}, ${styleFragment}${industryFragment}${colorStr}, white background, vector style, clean lines, centered composition, no text no letters no words`;
}

export function generateVariationPlan(
  count: number,
  baseStyle: string,
  industry: string | null
): VariationPlan[] {
  const plans: VariationPlan[] = [];

  // Always include the base style first
  const allStyles = VISUAL_STYLES.map((s) => s.id);
  const usedStyles: string[] = [];

  // Get industry-suggested styles if available
  const industryPreset = industry ? INDUSTRY_PRESETS.find((i) => i.id === industry) : null;
  const suggestedStyles = industryPreset?.suggestedStyles || [];

  // Priority order: base style, then industry-suggested, then remaining
  const priorityOrder = [
    baseStyle,
    ...suggestedStyles.filter((s) => s !== baseStyle),
    ...allStyles.filter((s) => s !== baseStyle && !suggestedStyles.includes(s)),
  ];

  for (let i = 0; i < count; i++) {
    const styleId = priorityOrder[i % priorityOrder.length];
    const style = VISUAL_STYLES.find((s) => s.id === styleId);

    if (usedStyles.includes(styleId) && i < allStyles.length) {
      // Find an unused style
      const unused = priorityOrder.find((s) => !usedStyles.includes(s));
      if (unused) {
        const unusedStyle = VISUAL_STYLES.find((s) => s.id === unused);
        usedStyles.push(unused);
        plans.push({
          index: i,
          visualStyle: unused,
          promptFragment: unusedStyle?.promptFragment || "",
          seed: Math.floor(Math.random() * 2147483647),
        });
        continue;
      }
    }

    usedStyles.push(styleId);
    plans.push({
      index: i,
      visualStyle: styleId,
      promptFragment: style?.promptFragment || "",
      seed: Math.floor(Math.random() * 2147483647),
    });
  }

  return plans;
}
