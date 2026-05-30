"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as htmlToImage from "html-to-image";
import { saveAs } from "file-saver";

type Battle = {
  id: string;
  manager: string;
  creator: string;
  opponent: string;
  time: string;
  creatorImage: string;
  opponentImage: string;
};

type SavedSchedule = {
  date_key: string;
  date_label: string;
  battles: Battle[];
  updated_at: string;
};

function cleanUsername(value: string) {
  return String(value || "").replace("@", "").trim();
}

function displayUsername(value: string) {
  const cleaned = cleanUsername(value);
  return cleaned ? `@${cleaned}` : "";
}

export default function PublicBattleSchedulePage() {
  const [schedule, setSchedule] = useState<SavedSchedule | null>(null);
  const [todayKey, setTodayKey] = useState("");
  const [loading, setLoading] = useState(true);

  const battles = useMemo(() => schedule?.battles || [], [schedule]);

  useEffect(() => {
    async function loadToday() {
      try {
        const res = await fetch("/api/schedule/today", { cache: "no-store" });
        const json = await res.json();

        setTodayKey(json.dateKey || "");
        setSchedule(json.schedule || null);
      } catch {
        setSchedule(null);
      } finally {
        setLoading(false);
      }
    }

    loadToday();
  }, []);

  async function downloadSchedule() {
    const node = document.getElementById("battle-schedule-export");
    if (!node) return;

    await document.fonts.ready;

    const blob = await htmlToImage.toBlob(node, {
      cacheBust: true,
      pixelRatio: 2,
      backgroundColor: "#120700",
      style: {
        margin: "0",
        transform: "none",
      },
    });

    if (!blob) return;

    saveAs(
      blob,
      `Honeybloom-Battle-Schedule-${
        schedule?.date_label || todayKey || "Today"
      }.png`
    );
  }

  return (
    <main className="relative min-h-screen w-screen overflow-x-hidden bg-[#120700] text-white">
      <img
        src="/honeybloom/poster-background.jpg"
        alt=""
        className="fixed inset-0 h-screen w-screen scale-[1.03] object-cover blur-[1.5px]"
      />

      <div className="fixed inset-0 bg-gradient-to-b from-black/5 via-black/10 to-black/65" />
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_50%_35%,transparent_0%,rgba(0,0,0,0.18)_55%,rgba(0,0,0,0.7)_100%)]" />

      <div className="relative z-10 mx-auto max-w-[1200px] px-3 pb-10 pt-4 sm:px-4">
        <div className="mb-4 flex flex-wrap gap-3">
          <a
            href="/"
            className="rounded-lg bg-[#f4aa24] px-4 py-3 font-black uppercase tracking-widest text-[#783e12] transition hover:bg-[#ffd477]"
          >
            Home
          </a>

          <a
            href="/schedule/admin"
            className="rounded-lg border border-[#f4aa24]/50 bg-black/35 px-4 py-3 font-black uppercase tracking-widest text-[#ffd477] transition hover:border-[#ffd477]"
          >
            Upload Schedule
          </a>

          <a
            href="/live/honeybloom-schedule"
            className="rounded-lg border border-[#f4aa24]/50 bg-black/35 px-4 py-3 font-black uppercase tracking-widest text-[#ffd477] transition hover:border-[#ffd477]"
          >
            No-Nav Public Link
          </a>

          <button
            type="button"
            onClick={downloadSchedule}
            disabled={!schedule || battles.length === 0}
            className="rounded-lg bg-[#f4aa24] px-4 py-3 font-black uppercase tracking-widest text-[#783e12] transition hover:bg-[#ffd477] disabled:opacity-40"
          >
            Download PNG
          </button>
        </div>

        {loading ? (
          <div className="mx-auto max-w-[760px] rounded-2xl border border-[#f4aa24]/35 bg-black/50 p-8 text-center font-black uppercase tracking-widest text-[#ffd477]">
            Loading today&apos;s battles...
          </div>
        ) : (
          <SchedulePoster schedule={schedule} battles={battles} />
        )}
      </div>
    </main>
  );
}

function SchedulePoster({
  schedule,
  battles,
}: {
  schedule: SavedSchedule | null;
  battles: Battle[];
}) {
  return (
    <div
      id="battle-schedule-export"
      className="relative mx-auto min-h-screen w-full max-w-[900px] overflow-visible px-3 pb-10 pt-0 sm:px-4"
    >
      <img
        src="/honeybloom-logo.png"
        alt="Honey Bloom Agency"
        className="mx-auto mb-0 w-[90vw] max-w-[650px] object-contain drop-shadow-[0_12px_22px_rgba(0,0,0,0.85)]"
      />

      <section className="mx-auto mb-4 w-full max-w-[760px] text-center">
        <div className="rounded-xl border border-[#f4aa24]/65 bg-black/58 px-3 py-4 shadow-[inset_0_0_16px_rgba(244,170,36,0.13),0_0_18px_rgba(0,0,0,0.5)] backdrop-blur-[2px]">
          <h1 className="text-[36px] font-black uppercase italic leading-none tracking-tight text-[#ffd477] drop-shadow-[0_3px_0_rgba(0,0,0,0.95)] sm:text-[64px]">
            Battle Lineup
          </h1>

          <p className="mt-2 text-[18px] font-black uppercase leading-none tracking-wide text-white drop-shadow-[0_2px_0_rgba(0,0,0,0.85)] sm:text-[28px]">
            {schedule?.date_label || "NO BATTLES UPLOADED"}
          </p>
        </div>
      </section>

      <section className="mx-auto w-full max-w-[760px] space-y-3">
        {battles.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-[#f4aa24]/55 bg-black/58 p-8 text-center shadow-[inset_0_0_16px_rgba(244,170,36,0.13),0_0_18px_rgba(0,0,0,0.5)] backdrop-blur-[2px]">
            <p className="font-black uppercase tracking-widest text-[#ffd477]">
              No battles uploaded for today
            </p>
          </div>
        ) : (
          battles.map((battle) => <BattleRow key={battle.id} battle={battle} />)
        )}
      </section>
    </div>
  );
}

function BattleRow({ battle }: { battle: Battle }) {
  return (
    <div className="rounded-xl border border-[#f4aa24]/65 bg-black/58 px-3 py-1 shadow-[inset_0_0_16px_rgba(244,170,36,0.13),0_0_18px_rgba(0,0,0,0.5)] backdrop-blur-[2px]">
      <div className="mb-2 flex translate-y-6 items-center justify-center">
        <div className="flex h-9 min-w-[108px] items-center justify-center rounded-lg bg-[#f4aa24] px-3 shadow-[0_0_16px_rgba(244,170,36,0.45)] sm:h-10 sm:min-w-[130px]">
          <p className="whitespace-nowrap text-[17px] font-black italic leading-none text-white drop-shadow-[0_2px_0_rgba(0,0,0,0.55)] sm:text-[23px]">
            {battle.time || "TIME"}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)_52px_minmax(0,1fr)] items-center gap-2 sm:grid-cols-[minmax(0,1fr)_74px_minmax(0,1fr)] sm:gap-4">
        <div className="flex min-w-0 -mt-10 flex-col items-center justify-center text-center">
          <Avatar src={battle.creatorImage} name={battle.creator} />
          <AutoFitName text={displayUsername(battle.creator)} />
        </div>

        <div className="flex items-center justify-center pt-0">
          <p className="text-[28px] font-black italic leading-none text-[#ffd477] drop-shadow-[0_3px_0_rgba(0,0,0,0.95)] sm:text-[42px]">
            VS
          </p>
        </div>

        <div className="flex min-w-0 -mt-10 flex-col items-center justify-center text-center">
          <Avatar src={battle.opponentImage} name={battle.opponent} />
          <AutoFitName text={displayUsername(battle.opponent)} />
        </div>
      </div>
    </div>
  );
}

function AutoFitName({ text }: { text: string }) {
  const boxRef = useRef<HTMLDivElement | null>(null);
  const textRef = useRef<HTMLParagraphElement | null>(null);
  const [fontSize, setFontSize] = useState(18);

  useEffect(() => {
    function fitText() {
      const box = boxRef.current;
      const el = textRef.current;
      if (!box || !el) return;

      let size = window.innerWidth < 640 ? 14 : 18;
      el.style.fontSize = `${size}px`;

      while (el.scrollWidth > box.clientWidth && size > 7) {
        size -= 0.5;
        el.style.fontSize = `${size}px`;
      }

      setFontSize(size);
    }

    fitText();
    window.addEventListener("resize", fitText);

    return () => window.removeEventListener("resize", fitText);
  }, [text]);

  return (
    <div ref={boxRef} className="mt-2 w-full min-w-0 px-1">
      <p
        ref={textRef}
        style={{ fontSize }}
        className="w-full whitespace-nowrap text-center font-black uppercase italic leading-none tracking-tight text-white drop-shadow-[0_2px_0_rgba(0,0,0,0.85)]"
      >
        {text}
      </p>
    </div>
  );
}

function Avatar({ src, name }: { src: string; name: string }) {
  const [imageSrc, setImageSrc] = useState(src || "");

  useEffect(() => {
    let cancelled = false;

    async function loadAvatar() {
      if (src) {
        setImageSrc(src);
        return;
      }

      const username = cleanUsername(name);
      if (!username) return;

      try {
        const res = await fetch("/api/tiktok-avatar", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username }),
        });

        const json = await res.json();

        if (!cancelled) setImageSrc(json.avatar || "");
      } catch {
        if (!cancelled) setImageSrc("");
      }
    }

    loadAvatar();

    return () => {
      cancelled = true;
    };
  }, [src, name]);

  return (
    <div className="h-28 w-28 shrink-0 overflow-hidden rounded-full border-2 border-[#f4aa24]/80 bg-black shadow-[0_0_14px_rgba(244,170,36,0.45)] sm:h-28 sm:w-28">
      {imageSrc ? (
        <img
          src={imageSrc}
          alt={name}
          crossOrigin="anonymous"
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-[10px] font-black text-[#ffd477] sm:text-xs">
          TT
        </div>
      )}
    </div>
  );
}