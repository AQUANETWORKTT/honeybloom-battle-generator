import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const dateKey = String(searchParams.get("dateKey") || "").trim();

    if (!dateKey) {
      return NextResponse.json({ error: "dateKey missing" }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from("battle_schedules")
      .select("date_key,date_label,battles,updated_at")
      .eq("date_key", dateKey)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      schedule: data || null,
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to load schedule" },
      { status: 500 }
    );
  }
}
