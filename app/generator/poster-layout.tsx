"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { Rnd } from "react-rnd";

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
type Preset = { id: string; name: string; layout: PosterLayout; background: string; typography: Typography };
export const DEFAULT_LAYOUT: PosterLayout = {
  avatar1: { x: 176, y: 397, width: 195, height: 195 },
  avatar2: { x: 672, y: 397, width: 195, height: 195 },
  username1: { x: 52, y: 595, width: 450, height: 80 },
  username2: { x: 547, y: 595, width: 450, height: 80 },
  date: { x: 90, y: 690, width: 900, height: 90 },
};
const STORAGE_KEY = "honeybloom-poster-layout-presets-v1";
export const DEFAULT_BACKGROUND = "/posters/honeybloom/background.png";
const initialPreset: Preset = { id: "local-default", name: "Honey Bloom default", layout: DEFAULT_LAYOUT, background: DEFAULT_BACKGROUND, typography: DEFAULT_TYPOGRAPHY };
function normalizeTypography(value: unknown): Typography {
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
function normalizeBackground(value: unknown) {
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

export function usePosterLayout() {
  const [presets, setPresets] = useState<Preset[]>([initialPreset]);
  const [presetId, setPresetId] = useState(initialPreset.id);
  const [layout, setLayout] = useState(DEFAULT_LAYOUT);
  const [name, setName] = useState(initialPreset.name);
  const [background, setBackground] = useState(DEFAULT_BACKGROUND);
  const [typography, setTypography] = useState(DEFAULT_TYPOGRAPHY);
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState("");
  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
    if (cancelled) return;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw);
        const restored: Preset[] = Array.isArray(saved.presets) ? saved.presets.filter((p: Preset) => p && typeof p.id === "string" && typeof p.name === "string").map((p: Preset) => ({ id: p.id, name: p.name, layout: normalizeLayout(p.layout), background: normalizeBackground(p.background), typography: normalizeTypography(p.typography) })) : [];
        if (restored.length) {
          const active = restored.find(p => p.id === saved.selectedId) || restored[0];
          setPresets(restored); setPresetId(active.id); setLayout(active.layout); setName(active.name); setBackground(active.background); setTypography(active.typography);
        }
      }
    } catch { setStatus("Saved layouts could not be loaded. The original layout is available."); }
    setReady(true);
    });
    return () => { cancelled = true; };
  }, []);
  function persist(next: Preset[], selectedId: string) {
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ presets: next, selectedId })); return true; }
    catch { setStatus("Browser storage is unavailable. Your layout is usable now, but could not be saved."); return false; }
  }
  function select(id: string) {
    const preset = presets.find(p => p.id === id);
    if (!preset) return;
    setPresetId(id); setName(preset.name); setLayout(preset.layout); setBackground(preset.background); setTypography(preset.typography);
    if (persist(presets, id)) setStatus(`Loaded ${preset.name}.`);
  }
  function save(asNew = false) {
    if (!name.trim()) { setStatus("Enter a preset name first."); return; }
    const id = asNew ? `local-${crypto.randomUUID()}` : presetId;
    const preset = { id, name: name.trim(), layout: normalizeLayout(layout), background, typography: normalizeTypography(typography) };
    const next = asNew ? [...presets, preset] : presets.map(p => p.id === id ? preset : p);
    if (!persist(next, id)) return;
    setPresets(next); setPresetId(id); setLayout(preset.layout);
    setStatus(`Saved ${preset.name} on this browser.`);
  }
  function remove() {
    const remaining = presets.filter(p => p.id !== presetId);
    const next = remaining.length ? remaining : [initialPreset];
    const active = next[0];
    if (!persist(next, active.id)) return;
    setPresets(next); setPresetId(active.id); setLayout(active.layout); setName(active.name); setBackground(active.background); setTypography(active.typography);
    setStatus(remaining.length ? "Preset deleted." : "Preset deleted. The original default is available.");
  }
  function update(key: ElementKey, patch: Partial<Box>) {
    if (key.startsWith("avatar") && (patch.width !== undefined || patch.height !== undefined)) {
      const size = patch.width ?? patch.height;
      patch = { ...patch, width: size, height: size };
    }
    setLayout(prev => normalizeLayout({ ...prev, [key]: { ...prev[key], ...patch } }));
    setStatus("Unsaved changes — save this preset to keep them.");
  }
  function changeBackground(value: string) { setBackground(normalizeBackground(value)); setStatus("Unsaved background — save this preset to keep it."); }
  function uploadBackground(file: File) {
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) { setStatus("Choose a PNG, JPG or WebP background."); return; }
    if (file.size > 2 * 1024 * 1024) { setStatus("Choose a background under 2 MB so it can be saved in this browser."); return; }
    const reader = new FileReader();
    reader.onload = () => changeBackground(String(reader.result));
    reader.onerror = () => setStatus("Could not read that background image.");
    reader.readAsDataURL(file);
  }
  function updateText(key: TextKey, patch: Partial<TextSettings>) {
    setTypography(prev => normalizeTypography({ ...prev, [key]: { ...prev[key], ...patch } }));
    setStatus("Unsaved text changes — save this preset to keep them.");
  }
  return { presets, presetId, layout, name, setName, background, changeBackground, uploadBackground, typography, updateText, ready, status, select, save, remove, update, reset: () => { setLayout(DEFAULT_LAYOUT); setStatus("Original layout restored. Save to keep it."); } };
}

export function FontEditor({ editor, selected }: { editor: ReturnType<typeof usePosterLayout>; selected: ElementKey }) {
  if (selected.startsWith("avatar")) return <p>Select a creator name or date/time box to edit its font.</p>;
  const key = selected as TextKey;
  const settings = editor.typography[key];
  return <fieldset className="border border-[#e6a52b]/45 rounded p-4 flex flex-wrap gap-4"><legend className="font-bold">Text styling — {ELEMENT_LABELS[key]}</legend>
    <label>Font <select aria-label="Text font" value={settings.fontFamily} onChange={e => editor.updateText(key, { fontFamily: e.target.value })} className="border rounded p-2 ml-2">{FONT_OPTIONS.map(font => <option key={font} value={font}>{font.replace("Poster ", "")}</option>)}</select></label>
    <label>Weight <select aria-label="Text weight" value={settings.fontWeight} onChange={e => editor.updateText(key, { fontWeight: Number(e.target.value) })} className="border rounded p-2 ml-2">{[400, 500, 600, 700, 800, 900].map(weight => <option key={weight} value={weight}>{weight}</option>)}</select></label>
    {([["fontSize", "Font size (0 = auto)"], ["strokeWidth", "Outline width"], ["letterSpacing", "Letter spacing"], ["shadowX", "Shadow X"], ["shadowY", "Shadow Y"], ["shadowBlur", "Shadow blur"]] as const).map(([field, label]) => <label key={field}>{label}<input aria-label={label} type="number" value={settings[field]} onChange={e => { if (e.target.value !== "") editor.updateText(key, { [field]: Number(e.target.value) }); }} className="border rounded p-2 w-20 ml-2" /></label>)}
    {([["color", "Text colour"], ["strokeColor", "Outline colour"], ["shadowColor", "Shadow colour"]] as const).map(([field, label]) => <label key={field}>{label}<input aria-label={label} type="color" value={settings[field]} onChange={e => editor.updateText(key, { [field]: e.target.value })} className="ml-2" /></label>)}
    <label><input type="checkbox" checked={settings.uppercase} onChange={e => editor.updateText(key, { uppercase: e.target.checked })} /> Uppercase</label>
  </fieldset>;
}

// Ported from Dan's PosterPreview: scaled, parent-bounded Rnd boxes.
export function LayoutHandles({ layout, selected, onSelect, onUpdate, scale }: { layout: PosterLayout; selected: ElementKey; onSelect: (key: ElementKey) => void; onUpdate: (key: ElementKey, patch: Partial<Box>) => void; scale: number }) {
  return <div className="absolute inset-0">
    {(Object.keys(ELEMENT_LABELS) as ElementKey[]).map(key => {
      const box = layout[key];
      return <Rnd key={key} scale={scale} bounds="parent" lockAspectRatio={key.startsWith("avatar")} position={{ x: box.x, y: box.y }} size={{ width: box.width, height: box.height }} minWidth={20} minHeight={20}
        onMouseDown={() => onSelect(key)} onTouchStart={() => onSelect(key)}
        onDragStop={(_, data) => { onSelect(key); onUpdate(key, { x: Math.round(data.x), y: Math.round(data.y) }); }}
        onResizeStop={(_, __, ref, ___, position) => { onSelect(key); onUpdate(key, { x: Math.round(position.x), y: Math.round(position.y), width: ref.offsetWidth, height: ref.offsetHeight }); }}
        style={{ borderRadius: key.startsWith("avatar") ? "50%" : 0, outline: `${selected === key ? 6 : 3}px solid ${selected === key ? "#d98705" : "#45a3b5"}`, touchAction: "none" }}>
        <div tabIndex={0} role="button" aria-label={ELEMENT_LABELS[key]} className="h-full cursor-move" onFocus={() => onSelect(key)} onKeyDown={event => {
          const step = event.shiftKey ? 10 : 1;
          const moves: Record<string, Partial<Box>> = { ArrowLeft: { x: box.x - step }, ArrowRight: { x: box.x + step }, ArrowUp: { y: box.y - step }, ArrowDown: { y: box.y + step } };
          if (moves[event.key]) { event.preventDefault(); onUpdate(key, moves[event.key]); }
        }}><span className="bg-white text-[#783e12] text-[22px] px-2">{ELEMENT_LABELS[key]}</span></div>
      </Rnd>;
    })}
  </div>;
}
