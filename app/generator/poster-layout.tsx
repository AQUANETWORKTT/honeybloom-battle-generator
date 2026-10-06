"use client";

import { useEffect, useState } from "react";
import { Rnd } from "react-rnd";

import { ELEMENT_LABELS, FONT_OPTIONS, DEFAULT_LAYOUT, DEFAULT_BACKGROUND, initialPreset, STORAGE_KEY, normalizeLayout, normalizeBackground, normalizeTypography, type Preset, type ElementKey, type TextKey, type PosterLayout } from "./poster-preset";
export { boxStyle, ELEMENT_LABELS, textStyle, type ElementKey } from "./poster-preset";
type Box = PosterLayout[ElementKey];
type TextSettings = Preset["typography"][TextKey];

export function usePosterLayout() {
  const [presets, setPresets] = useState<Preset[]>([initialPreset]);
  const [presetId, setPresetId] = useState(initialPreset.id);
  const [layout, setLayout] = useState(DEFAULT_LAYOUT);
  const [name, setName] = useState(initialPreset.name);
  const [background, setBackground] = useState(DEFAULT_BACKGROUND);
  const [typography, setTypography] = useState(initialPreset.typography);
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [sharedAvailable, setSharedAvailable] = useState(false);
  useEffect(() => {
    let cancelled = false;
    async function load() {
      let restored: Preset[] = [];
      let selectedId = "";
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const cached = JSON.parse(raw);
          selectedId = cached.selectedId;
          restored = Array.isArray(cached.presets) ? cached.presets.filter((p: Preset) => p && typeof p.id === "string" && typeof p.name === "string").map((p: Preset) => ({ ...p, layout: normalizeLayout(p.layout), background: normalizeBackground(p.background), typography: normalizeTypography(p.typography) })) : [];
        }
      } catch { /* Shared storage works even if browser storage is disabled. */ }
      try {
        const response = await fetch("/api/honeybloom-presets", { cache: "no-store" });
        const result = await response.json();
        if (!response.ok || !Array.isArray(result.presets)) throw new Error(result.error || "Could not load shared presets.");
        const shared = result.presets as Preset[];
        restored = [initialPreset, ...restored.filter(p => p.id.startsWith("local-") && p.id !== initialPreset.id), ...shared];
        if (!cancelled) { setSharedAvailable(true); setStatus("Honey Bloom shared presets loaded."); }
      } catch {
        if (!cancelled) setStatus("Shared presets could not be loaded. Cached presets are available; saving will retry online.");
      }
      if (cancelled) return;
      if (!restored.length) restored = [initialPreset];
      const active = restored.find(p => p.id === selectedId) || restored.find(p => !p.id.startsWith("local-")) || restored[0];
      setPresets(restored); setPresetId(active.id); setLayout(active.layout); setName(active.name); setBackground(active.background); setTypography(active.typography);
      setReady(true);
    }
    void load();
    return () => { cancelled = true; };
  }, []);
  function persist(next: Preset[], selectedId: string) {
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ presets: next, selectedId })); }
    catch { /* Browser cache is optional; shared storage is authoritative. */ }
  }
  function select(id: string) {
    const preset = presets.find(p => p.id === id);
    if (!preset) return;
    setPresetId(id); setName(preset.name); setLayout(preset.layout); setBackground(preset.background); setTypography(preset.typography);
    persist(presets, id);
    setStatus(id.startsWith("local-") ? `Loaded ${preset.name}. Save to publish it to Honey Bloom.` : `Loaded ${preset.name}.`);
  }
  async function save(asNew = false) {
    if (busy) return;
    if (!name.trim()) { setStatus("Enter a preset name first."); return; }
    setBusy(true); setStatus("Saving shared Honey Bloom preset...");
    const id = asNew || presetId.startsWith("local-") ? crypto.randomUUID() : presetId;
    const preset = { id, name: name.trim(), layout: normalizeLayout(layout), background, typography: normalizeTypography(typography) };
    try {
      const response = await fetch("/api/honeybloom-presets", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ preset }) });
      const result = await response.json();
      if (!response.ok || !result.preset) throw new Error(result.error || "Could not publish this preset.");
      const saved = result.preset as Preset;
      let next = presets.filter(p => p.id !== saved.id && (asNew || p.id !== presetId || p.id === initialPreset.id));
      next = [...next, saved];
      persist(next, saved.id);
      setPresets(next); setPresetId(saved.id); setLayout(saved.layout); setTypography(saved.typography); setSharedAvailable(true);
      setStatus(`Saved ${saved.name} publicly to Honey Bloom. Available across browsers and devices.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not save publicly. Your changes are still in the editor.");
    } finally { setBusy(false); }
  }
  async function remove() {
    if (busy) return;
    setBusy(true);
    try {
      if (!presetId.startsWith("local-")) {
        const response = await fetch("/api/honeybloom-presets", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: presetId }) });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Could not delete the shared preset.");
      }
      const remaining = presets.filter(p => p.id !== presetId);
      const next = remaining.length ? remaining : [initialPreset];
      const active = next.find(p => !p.id.startsWith("local-")) || next[0];
      persist(next, active.id);
      setPresets(next); setPresetId(active.id); setLayout(active.layout); setName(active.name); setBackground(active.background); setTypography(active.typography);
      setStatus(presetId.startsWith("local-") ? "Browser preset removed." : "Shared Honey Bloom preset deleted.");
    } catch (error) { setStatus(error instanceof Error ? error.message : "Could not delete this preset."); }
    finally { setBusy(false); }
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
    if (file.size > 2 * 1024 * 1024) { setStatus("Choose a background under 2 MB."); return; }
    const reader = new FileReader();
    reader.onload = () => changeBackground(String(reader.result));
    reader.onerror = () => setStatus("Could not read that background image.");
    reader.readAsDataURL(file);
  }
  function updateText(key: TextKey, patch: Partial<TextSettings>) {
    setTypography(prev => normalizeTypography({ ...prev, [key]: { ...prev[key], ...patch } }));
    setStatus("Unsaved text changes — save this preset to keep them.");
  }
  return { presets, presetId, layout, name, setName, background, changeBackground, uploadBackground, typography, updateText, busy, sharedAvailable, ready, status, select, save, remove, update, reset: () => { setLayout(DEFAULT_LAYOUT); setStatus("Original layout restored. Save to keep it."); } };
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
