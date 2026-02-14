import sharp from "sharp";
import { FONT_STYLES, type TextPosition } from "./config";

export interface CompositeOptions {
  fontStyle?: string;
  fontSize?: number;
  fontWeight?: string;
  textColor?: string;
  textPosition?: TextPosition;
  canvasWidth?: number;
  canvasHeight?: number;
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function getFontConfig(fontStyleId: string) {
  const font = FONT_STYLES.find((f) => f.id === fontStyleId) || FONT_STYLES[0];
  return font;
}

function buildTextSvg(
  text: string,
  width: number,
  height: number,
  options: {
    fontFamily: string;
    fallback: string;
    fontSize: number;
    fontWeight: string;
    color: string;
    yPosition?: number;
    textAnchor?: string;
    xPosition?: number;
  }
): Buffer {
  const escaped = escapeXml(text);
  const x = options.xPosition ?? width / 2;
  const y = options.yPosition ?? height / 2;
  const anchor = options.textAnchor ?? "middle";

  const svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <text
    x="${x}"
    y="${y}"
    font-family="${options.fontFamily}, ${options.fallback}, sans-serif"
    font-size="${options.fontSize}"
    font-weight="${options.fontWeight}"
    fill="${options.color}"
    text-anchor="${anchor}"
    dominant-baseline="central"
  >${escaped}</text>
</svg>`;

  return Buffer.from(svg);
}

/**
 * Composite an icon image with company name text below or beside it.
 */
export async function compositeIconWithText(
  iconBuffer: Buffer,
  companyName: string,
  options: CompositeOptions = {}
): Promise<Buffer> {
  const {
    fontStyle = "sans-serif",
    fontSize,
    textColor = "#1E293B",
    textPosition = "below",
    canvasWidth = 1024,
    canvasHeight = 1024,
  } = options;

  const font = getFontConfig(fontStyle);

  if (textPosition === "right") {
    // Side-by-side layout: icon on left, text on right
    const iconSize = Math.floor(canvasHeight * 0.6);
    const textAreaWidth = Math.floor(canvasWidth * 0.55);
    const totalWidth = canvasWidth + Math.floor(canvasWidth * 0.2);
    const computedFontSize = fontSize || Math.floor(iconSize * 0.25);

    const resizedIcon = await sharp(iconBuffer)
      .resize(iconSize, iconSize, { fit: "contain", background: { r: 255, g: 255, b: 255, alpha: 0 } })
      .png()
      .toBuffer();

    const textSvg = buildTextSvg(companyName, textAreaWidth, canvasHeight, {
      fontFamily: font.fontFamily,
      fallback: font.fallback,
      fontSize: computedFontSize,
      fontWeight: font.fontWeight,
      color: textColor,
      xPosition: 0,
      textAnchor: "start",
    });

    const iconLeft = Math.floor((totalWidth - iconSize - textAreaWidth) / 2);
    const textLeft = iconLeft + iconSize + Math.floor(canvasWidth * 0.04);

    return sharp({
      create: {
        width: totalWidth,
        height: canvasHeight,
        channels: 4,
        background: { r: 255, g: 255, b: 255, alpha: 1 },
      },
    })
      .composite([
        { input: resizedIcon, left: iconLeft, top: Math.floor((canvasHeight - iconSize) / 2) },
        { input: textSvg, left: textLeft, top: 0 },
      ])
      .png()
      .toBuffer();
  }

  // Default: text below icon
  const iconSize = Math.floor(canvasHeight * 0.6);
  const textAreaHeight = Math.floor(canvasHeight * 0.25);
  const computedFontSize = fontSize || Math.floor(textAreaHeight * 0.4);
  const gap = Math.floor(canvasHeight * 0.03);

  const resizedIcon = await sharp(iconBuffer)
    .resize(iconSize, iconSize, { fit: "contain", background: { r: 255, g: 255, b: 255, alpha: 0 } })
    .png()
    .toBuffer();

  const textSvg = buildTextSvg(companyName, canvasWidth, textAreaHeight, {
    fontFamily: font.fontFamily,
    fallback: font.fallback,
    fontSize: computedFontSize,
    fontWeight: font.fontWeight,
    color: textColor,
  });

  const iconTop = Math.floor((canvasHeight - iconSize - textAreaHeight - gap) / 2);
  const textTop = iconTop + iconSize + gap;

  return sharp({
    create: {
      width: canvasWidth,
      height: canvasHeight,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    },
  })
    .composite([
      { input: resizedIcon, left: Math.floor((canvasWidth - iconSize) / 2), top: iconTop },
      { input: textSvg, left: 0, top: textTop },
    ])
    .png()
    .toBuffer();
}

/**
 * Generate a text-only logo via SVG rendered through sharp.
 */
export async function generateTextOnly(
  companyName: string,
  options: CompositeOptions = {}
): Promise<Buffer> {
  const {
    fontStyle = "sans-serif",
    fontSize,
    textColor = "#1E293B",
    canvasWidth = 1024,
    canvasHeight = 1024,
  } = options;

  const font = getFontConfig(fontStyle);
  const computedFontSize = fontSize || Math.floor(canvasHeight * 0.12);

  const textSvg = buildTextSvg(companyName, canvasWidth, canvasHeight, {
    fontFamily: font.fontFamily,
    fallback: font.fallback,
    fontSize: computedFontSize,
    fontWeight: font.fontWeight,
    color: textColor,
  });

  return sharp({
    create: {
      width: canvasWidth,
      height: canvasHeight,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    },
  })
    .composite([{ input: textSvg, left: 0, top: 0 }])
    .png()
    .toBuffer();
}

/**
 * Generate an emblem-style logo with text on a circular arc around the icon.
 */
export async function generateEmblem(
  iconBuffer: Buffer,
  companyName: string,
  options: CompositeOptions = {}
): Promise<Buffer> {
  const {
    fontStyle = "sans-serif",
    fontSize,
    textColor = "#1E293B",
    canvasWidth = 1024,
    canvasHeight = 1024,
  } = options;

  const font = getFontConfig(fontStyle);
  const computedFontSize = fontSize || Math.floor(canvasHeight * 0.06);

  const iconSize = Math.floor(canvasHeight * 0.45);
  const escaped = escapeXml(companyName.toUpperCase());

  // Circle parameters for text path
  const cx = canvasWidth / 2;
  const cy = canvasHeight / 2;
  const radius = Math.floor(canvasHeight * 0.38);
  const borderRadius = Math.floor(canvasHeight * 0.42);

  const emblemSvg = Buffer.from(`<svg width="${canvasWidth}" height="${canvasHeight}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <path id="textArc" d="M ${cx - radius},${cy} A ${radius},${radius} 0 0,1 ${cx + radius},${cy}" />
  </defs>
  <circle cx="${cx}" cy="${cy}" r="${borderRadius}" fill="none" stroke="${textColor}" stroke-width="3" opacity="0.3" />
  <circle cx="${cx}" cy="${cy}" r="${borderRadius - 8}" fill="none" stroke="${textColor}" stroke-width="1" opacity="0.2" />
  <text
    font-family="${font.fontFamily}, ${font.fallback}, sans-serif"
    font-size="${computedFontSize}"
    font-weight="${font.fontWeight}"
    fill="${textColor}"
    letter-spacing="4"
  >
    <textPath href="#textArc" startOffset="50%" text-anchor="middle">${escaped}</textPath>
  </text>
</svg>`);

  const resizedIcon = await sharp(iconBuffer)
    .resize(iconSize, iconSize, { fit: "contain", background: { r: 255, g: 255, b: 255, alpha: 0 } })
    .png()
    .toBuffer();

  return sharp({
    create: {
      width: canvasWidth,
      height: canvasHeight,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    },
  })
    .composite([
      { input: resizedIcon, left: Math.floor((canvasWidth - iconSize) / 2), top: Math.floor((canvasHeight - iconSize) / 2 + canvasHeight * 0.05) },
      { input: emblemSvg, left: 0, top: 0 },
    ])
    .png()
    .toBuffer();
}
