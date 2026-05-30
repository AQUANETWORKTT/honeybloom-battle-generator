import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

function getTodayUkDateKey() {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/London",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  return formatter.format(new Date());
}

export async function GET() {
  try {
    const dateKey = getTodayUkDateKey();

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
      dateKey,
      schedule: data || null,
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to load today's schedule" },
      { status: 500 }
    );
  }
}
