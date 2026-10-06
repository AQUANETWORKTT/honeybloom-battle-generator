import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { normalizeLayout, normalizeTypography, normalizeBackground, type Preset } from "@/app/generator/poster-preset";

// Honey Bloom's own bucket. Never reads or writes Dan's poster tables/buckets.
const BUCKET = "honeybloom-poster-presets";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function failure(error: unknown) {
  console.error("Honey Bloom preset storage:", error);
  return NextResponse.json({ error: "Honey Bloom shared preset storage is unavailable. Your changes have not been published." }, { status: 503 });
}
function authorized(request: NextRequest) {
  const origin = request.headers.get("origin");
  return request.cookies.get("honeybloom-auth")?.value === "true" && (!origin || origin === request.nextUrl.origin);
}
async function bucketExists(create = false) {
  const { data, error } = await supabaseAdmin.storage.getBucket(BUCKET);
  if (data) return true;
  if (error && !/not found/i.test(error.message)) throw error;
  if (!create) return false;
  const result = await supabaseAdmin.storage.createBucket(BUCKET, { public: false, fileSizeLimit: 3 * 1024 * 1024, allowedMimeTypes: ["application/json"] });
  if (result.error) {
    // A concurrent first save may already have created this bucket.
    const check = await supabaseAdmin.storage.getBucket(BUCKET);
    if (!check.data) throw result.error;
  }
  return true;
}
function normalizePreset(value: unknown): Preset {
  const input = value as Preset;
  if (!input || !UUID.test(input.id) || typeof input.name !== "string" || !input.name.trim() || input.name.length > 120 || !input.layout || typeof input.layout !== "object") throw new Error("Invalid preset");
  return { id: input.id, name: input.name.trim(), layout: normalizeLayout(input.layout), typography: normalizeTypography(input.typography), background: normalizeBackground(input.background) };
}
export async function GET() {
  try {
    if (!await bucketExists()) return NextResponse.json({ presets: [] }, { headers: { "Cache-Control": "no-store" } });
    const presets: Preset[] = [];
    for (let offset = 0; ; offset += 100) {
      const { data, error } = await supabaseAdmin.storage.from(BUCKET).list("", { limit: 100, offset, sortBy: { column: "name", order: "asc" } });
      if (error) throw error;
      const rows = data || [];
      const batch = await Promise.all(rows.filter(row => UUID.test(row.name.replace(/\.json$/, "")) && row.name.endsWith(".json")).map(async row => {
        const file = await supabaseAdmin.storage.from(BUCKET).download(row.name);
        if (file.error || !file.data) throw file.error || new Error("Missing preset");
        return normalizePreset(JSON.parse(await file.data.text()));
      }));
      presets.push(...batch);
      if (rows.length < 100) break;
    }
    presets.sort((a, b) => a.name.localeCompare(b.name));
    return NextResponse.json({ presets }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return failure(error); }
}
export async function POST(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ error: "Sign in to Honey Bloom to save shared presets." }, { status: 401 });
  let preset: Preset;
  try {
    const text = await request.text();
    if (text.length > 3 * 1024 * 1024) return NextResponse.json({ error: "This preset is too large." }, { status: 413 });
    preset = normalizePreset(JSON.parse(text).preset);
  } catch { return NextResponse.json({ error: "Invalid preset." }, { status: 400 }); }
  try {
    await bucketExists(true);
    const { error } = await supabaseAdmin.storage.from(BUCKET).upload(`${preset.id}.json`, JSON.stringify(preset), { contentType: "application/json", upsert: true, cacheControl: "0" });
    if (error) throw error;
    return NextResponse.json({ preset });
  } catch (error) { return failure(error); }
}
export async function DELETE(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ error: "Sign in to Honey Bloom to delete shared presets." }, { status: 401 });
  let id: string;
  try { id = (await request.json()).id; } catch { return NextResponse.json({ error: "Invalid preset ID." }, { status: 400 }); }
  if (typeof id !== "string" || !UUID.test(id)) return NextResponse.json({ error: "Invalid preset ID." }, { status: 400 });
  try {
    const { error } = await supabaseAdmin.storage.from(BUCKET).remove([`${id}.json`]);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (error) { return failure(error); }
}
