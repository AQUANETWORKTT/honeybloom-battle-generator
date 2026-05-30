import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type Battle = {
  id: string;
  manager: string;
  creator: string;
  opponent: string;
  time: string;
  creatorImage: string;
  opponentImage: string;
};

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const dateKey = String(body.dateKey || "").trim();
    const dateLabel = String(body.dateLabel || "").trim();
    const battles = body.battles as Battle[];

    if (!dateKey || !dateLabel || !Array.isArray(battles)) {
      return NextResponse.json(
        { error: "Missing dateKey, dateLabel or battles" },
        { status: 400 }
      );
    }

    const { error } = await supabaseAdmin.from("battle_schedules").upsert(
      {
        date_key: dateKey,
        date_label: dateLabel,
        battles,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "date_key",
      }
    );

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to save schedule" },
      { status: 500 }
    );
  }
}
