import type { CSSProperties } from "react";

export const ELEMENT_LABELS = { avatar1: "Creator 1 photo", avatar2: "Creator 2 photo", username1: "Creator 1 name", username2: "Creator 2 name", date: "Date and time" };
export type ElementKey = keyof typeof ELEMENT_LABELS;
type Box = { x: number; y: number; width: number; height: number };
export type PosterLayout = Record<ElementKey, Box>;
export type TextKey = "username1" | "username2" | "date";
type TextSettings = { fontFamily: string; fontSize: number; fontWeight: number; color: string; strokeColor: string; strokeWidth: number; letterSpacing: number; shadowColor: string; shadowX: number; shadowY: number; shadowBlur: number; uppercase: boolean };
type Typography = Record<TextKey, TextSettings>;
export const FONT_OPTIONS = ["Poster Cooper Black", "Poster Luckiest Guy", "Norwester", "Impact", "Arial", "Georgia", "Times New Roman"];
const nameStyle: TextSettings = { fontFamily: "Poster Cooper Black", fontSize: 0, fontWeight: 900, color: "#934918", strokeColor: "#934918", strokeWidth: 0, letterSpacing: -1, shadowColor: "#934918", shadowX: 0, shadowY: 0, shadowBlur: 0, uppercase: true };
const DEFAULT_TYPOGRAPHY: Typography = { username1: nameStyle, username2: { ...nameStyle }, date: { ...nameStyle, fontFamily: "Poster Luckiest Guy", color: "#ffc83d", strokeWidth: 6, letterSpacing: 1, shadowX: 2, shadowY: 2 } };
export type Preset = { id: string; name: string; layout: PosterLayout; background: string; typography: Typography };
export const DEFAULT_LAYOUT: PosterLayout = {
  avatar1: { x: 176, y: 397, width: 195, height: 195 },
  avatar2: { x: 672, y: 397, width: 195, height: 195 },
  username1: { x: 52, y: 595, width: 450, height: 80 },
  username2: { x: 547, y: 595, width: 450, height: 80 },
  date: { x: 90, y: 690, width: 900, height: 90 },
};
export const STORAGE_KEY = "honeybloom-poster-layout-presets-v1";
export const DEFAULT_BACKGROUND = "/posters/honeybloom/background.png";
export const initialPreset: Preset = { id: "local-default", name: "Honey Bloom default", layout: DEFAULT_LAYOUT, background: DEFAULT_BACKGROUND, typography: DEFAULT_TYPOGRAPHY };
export function normalizeTypography(value: unknown): Typography {
  const result = {} as Typography;
  const input = value && typeof value === "object" ? value as Partial<Typography> : {};
  for (const key of Object.keys(DEFAULT_TYPOGRAPHY) as TextKey[]) {
    const defaults = DEFAULT_TYPOGRAPHY[key];
    const item = input[key];
    const settings = { ...defaults };
    if (item && typeof item === "object") {
      for (const field of ["fontSize", "fontWeight", "strokeWidth", "letterSpacing", "shadowX", "shadowY", "shadowBlur"] as const) {
        const n = item[field];
        if (typeof n === "number" && Number.isFinite(n)) settings[field] = Math.max(field === "letterSpacing" || field === "shadowX" || field === "shadowY" ? -100 : 0, Math.min(field === "fontWeight" ? 900 : 300, n));
      }
      for (const field of ["color", "strokeColor", "shadowColor"] as const) if (typeof item[field] === "string" && /^#[0-9a-f]{6}$/i.test(item[field])) settings[field] = item[field];
      if (FONT_OPTIONS.includes(item.fontFamily)) settings.fontFamily = item.fontFamily;
      if (typeof item.uppercase === "boolean") settings.uppercase = item.uppercase;
    }
    result[key] = settings;
  }
  return result;
}
export function textStyle(settings: TextSettings): CSSProperties {
  return { fontFamily: `"${settings.fontFamily}", Arial, sans-serif`, fontWeight: settings.fontWeight, color: settings.color, WebkitTextStroke: `${settings.strokeWidth}px ${settings.strokeColor}`, paintOrder: "stroke fill", letterSpacing: `${settings.letterSpacing}px`, textShadow: `${settings.shadowX}px ${settings.shadowY}px ${settings.shadowBlur}px ${settings.shadowColor}`, ...(settings.fontSize > 0 ? { fontSize: settings.fontSize } : {}) };
}
export function normalizeBackground(value: unknown) {
  return typeof value === "string" && (value === DEFAULT_BACKGROUND || value === "/honeybloom/poster-background.jpg" || /^data:image\/(png|jpeg|webp);base64,/.test(value)) ? value : DEFAULT_BACKGROUND;
}

export function normalizeLayout(value: unknown): PosterLayout {
  const result = {} as PosterLayout;
  const input = value && typeof value === "object" ? value as Partial<PosterLayout> : {};
  for (const key of Object.keys(DEFAULT_LAYOUT) as ElementKey[]) {
    const box = input[key];
    const fallback = DEFAULT_LAYOUT[key];
    const number = (field: keyof Box) => typeof box?.[field] === "number" && Number.isFinite(box[field]) ? box[field] : fallback[field];
    const width = Math.max(20, Math.min(1080, number("width")));
    const height = Math.max(20, Math.min(1090, number("height")));
    result[key] = { width, height, x: Math.max(0, Math.min(1080 - width, number("x"))), y: Math.max(0, Math.min(1090 - height, number("y"))) };
  }
  return result;
}

export function boxStyle(layout: PosterLayout, key: ElementKey) {
  const box = layout[key];
  return { left: box.x, top: box.y, width: box.width, height: box.height };
}

