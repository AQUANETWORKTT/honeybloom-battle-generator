"use client";

import { useMemo, useState } from "react";
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

const DEFAULT_YEAR = 2026;

const MONTHS = [
  { label: "January", value: 0 },
  { label: "February", value: 1 },
  { label: "March", value: 2 },
  { label: "April", value: 3 },
  { label: "May", value: 4 },
  { label: "June", value: 5 },
  { label: "July", value: 6 },
  { label: "August", value: 7 },
  { label: "September", value: 8 },
  { label: "October", value: 9 },
  { label: "November", value: 10 },
  { label: "December", value: 11 },
];

function makeId() {
  return crypto.randomUUID();
}

function getOrdinal(day: number) {
  if (day > 3 && day < 21) return `${day}TH`;

  switch (day % 10) {
    case 1:
      return `${day}ST`;
    case 2:
      return `${day}ND`;
    case 3:
      return `${day}RD`;
    default:
      return `${day}TH`;
  }
}

function getDaysInMonth(monthRaw: string) {
  if (!monthRaw) return 31;
  return new Date(DEFAULT_YEAR, Number(monthRaw) + 1, 0).getDate();
}

function formatDateFromParts(dayRaw: string, monthRaw: string) {
  if (!dayRaw || !monthRaw) return "";

  const day = Number(dayRaw);
  const month = Number(monthRaw);
  const date = new Date(DEFAULT_YEAR, month, day, 12, 0, 0);

  const weekday = date.toLocaleDateString("en-GB", { weekday: "long" });
  const monthName = date.toLocaleDateString("en-GB", { month: "long" });

  return `${weekday} ${getOrdinal(day)} ${monthName}`.toUpperCase();
}

function cleanUsername(value: string) {
  return String(value || "")
    .replace("@", "")
    .trim()
    .toLowerCase();
}

function displayUsername(value: string) {
  const cleaned = cleanUsername(value);
  return cleaned ? `@${cleaned}` : "";
}

function formatTime(raw: string) {
  if (!raw) return "";

  let value = raw.trim().toLowerCase();
  value = value.replace(/\./g, "");
  value = value.replace(/\s+/g, " ");

  const match = value.match(/^(\d{1,2})(?::(\d{2}))?(?::\d{2})?\s*(am|pm)?$/);

  if (!match) return raw.toUpperCase();

  let hour = Number(match[1]);
  const minute = match[2] || "00";
  let period = match[3];

  if (!period) period = "pm";

  if (hour > 12) hour -= 12;
  if (hour === 0) hour = 12;

  return `${hour}:${minute}${period.toUpperCase()}`;
}

function timeToMinutes(time: string) {
  const match = time.match(/^(\d{1,2}):(\d{2})(AM|PM)$/i);
  if (!match) return 99999;

  let hour = Number(match[1]);
  const minute = Number(match[2]);
  const period = match[3].toUpperCase();

  if (period === "PM" && hour !== 12) hour += 12;
  if (period === "AM" && hour === 12) hour = 0;

  return hour * 60 + minute;
}

function getTikTokUsername(url: string) {
  const match = String(url || "").match(/@([^/?\s]+)/);
  return match ? match[1].toLowerCase() : "";
}

function parseRow(row: string): Battle {
  const parts = row.split(/\t+/);

  // Honeybloom format:
  // A = manager
  // B = predicted diamonds ignored
  // C = creator username
  // D = ignored/link
  // E = battle time
  // F = ignored/link
  // G = opponent name
  // H = agency ignored
  const manager = String(parts[0] || "HONEYBLOOM").trim().toUpperCase();

  const creator =
    cleanUsername(parts[2] || "") ||
    getTikTokUsername(parts[3] || "") ||
    cleanUsername(parts[0] || "");

  const opponent =
    cleanUsername(parts[6] || "") ||
    getTikTokUsername(parts[5] || "");

  const time = formatTime(parts[4] || "");

  return {
    id: makeId(),
    manager,
    creator,
    opponent,
    time,
    creatorImage: "",
    opponentImage: "",
  };
}

export default function BattleSchedulePage() {
  const [day, setDay] = useState("");
  const [month, setMonth] = useState("4");
  const [paste, setPaste] = useState("");
  const [battles, setBattles] = useState<Battle[]>([]);
  const [loading, setLoading] = useState(false);

  const selectedDate = useMemo(() => formatDateFromParts(day, month), [day, month]);
  const daysInMonth = getDaysInMonth(month);

  async function fetchTikTokAvatar(username: string) {
    const clean = cleanUsername(username);
    if (!clean) return "";

    try {
      const res = await fetch("/api/tiktok-avatar", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username: clean }),
      });

      const json = await res.json();
      return json.avatar || "";
    } catch {
      return "";
    }
  }

  async function buildSchedule() {
    const rows = paste
      .split("\n")
      .map((row) => row.trim())
      .filter(Boolean);

    if (rows.length === 0) return;

    setLoading(true);

    const parsed = rows
      .map(parseRow)
      .filter((battle) => battle.creator || battle.opponent || battle.time);

    const withImages: Battle[] = [];

    for (const battle of parsed) {
      const creatorImage = await fetchTikTokAvatar(battle.creator);
      const opponentImage = await fetchTikTokAvatar(battle.opponent);

      withImages.push({
        ...battle,
        creatorImage,
        opponentImage,
      });
    }

    withImages.sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time));

    setBattles(withImages);
    setLoading(false);
  }

  function clearSchedule() {
    setPaste("");
    setBattles([]);
  }

  async function downloadSchedule() {
    const node = document.getElementById("battle-schedule-export");
    if (!node) return;

    await document.fonts.ready;

    const blob = await htmlToImage.toBlob(node, {
      cacheBust: true,
      pixelRatio: 2,
      backgroundColor: "#130903",
      style: {
        margin: "0",
        transform: "none",
      },
    });

    if (!blob) return;

    saveAs(blob, `Honeybloom-Battle-Schedule-${selectedDate || "Date"}.png`);
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#130903] p-4 text-white md:p-8">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,#8b4b06_0%,#2c1304_42%,#090301_100%)]" />

      <img
        src="/honeycomb-corner.png"
        alt=""
        className="pointer-events-none absolute -left-8 -top-8 w-72 opacity-55"
        style={{
          WebkitMaskImage:
            "linear-gradient(to right, transparent 0%, black 22%, black 78%, transparent 100%), linear-gradient(to bottom, transparent 0%, black 22%, black 78%, transparent 100%)",
          WebkitMaskComposite: "source-in",
          maskImage:
            "linear-gradient(to right, transparent 0%, black 22%, black 78%, transparent 100%), linear-gradient(to bottom, transparent 0%, black 22%, black 78%, transparent 100%)",
          maskComposite: "intersect",
        }}
      />

      <img
        src="/honeycomb-corner.png"
        alt=""
        className="pointer-events-none absolute -bottom-8 -right-8 w-80 rotate-180 opacity-55"
        style={{
          WebkitMaskImage:
            "linear-gradient(to right, transparent 0%, black 22%, black 78%, transparent 100%), linear-gradient(to bottom, transparent 0%, black 22%, black 78%, transparent 100%)",
          WebkitMaskComposite: "source-in",
          maskImage:
            "linear-gradient(to right, transparent 0%, black 22%, black 78%, transparent 100%), linear-gradient(to bottom, transparent 0%, black 22%, black 78%, transparent 100%)",
          maskComposite: "intersect",
        }}
      />

      <div className="relative z-10 mx-auto max-w-[1700px] space-y-6">
        <div className="flex flex-wrap gap-3">
          <a
            href="/"
            className="rounded-lg bg-[#f4aa24] px-4 py-3 font-black uppercase tracking-widest text-[#783e12] transition hover:bg-[#ffd477]"
          >
            Home
          </a>

          <a
            href="/generator"
            className="rounded-lg border border-[#f4aa24]/50 bg-black/35 px-4 py-3 font-black uppercase tracking-widest text-[#ffd477] transition hover:border-[#ffd477]"
          >
            Poster Generator
          </a>
        </div>

        <div className="grid grid-cols-1 gap-8 xl:grid-cols-[430px_1fr]">
          <section className="space-y-5">
            <div className="rounded-2xl border border-[#f4aa24]/35 bg-black/50 p-5 shadow-[0_18px_45px_rgba(0,0,0,0.35)]">
              <h1 className="text-3xl font-black uppercase tracking-[0.16em] text-[#ffd477]">
                Battle Schedule
              </h1>

              <p className="mt-2 text-sm text-white/60">
                Paste the Honeybloom battle sheet and generate a daily battle schedule.
              </p>
            </div>

            <div className="rounded-2xl border border-[#f4aa24]/35 bg-black/50 p-5 shadow-[0_18px_45px_rgba(0,0,0,0.35)]">
              <p className="mb-2 text-xs font-black uppercase tracking-widest text-[#ffd477]">
                Date
              </p>

              <div className="grid grid-cols-2 gap-3">
                <select
                  value={day}
                  onChange={(e) => setDay(e.target.value)}
                  className="rounded-lg border border-[#f4aa24]/40 bg-[#1d0c02] p-3 text-[#ffd477] outline-none focus:border-[#ffd477]"
                >
                  <option value="">Day</option>
                  {Array.from({ length: daysInMonth }, (_, index) => {
                    const value = String(index + 1);
                    return (
                      <option key={value} value={value}>
                        {getOrdinal(index + 1)}
                      </option>
                    );
                  })}
                </select>

                <select
                  value={month}
                  onChange={(e) => setMonth(e.target.value)}
                  className="rounded-lg border border-[#f4aa24]/40 bg-[#1d0c02] p-3 text-[#ffd477] outline-none focus:border-[#ffd477]"
                >
                  <option value="">Month</option>
                  {MONTHS.map((monthOption) => (
                    <option key={monthOption.value} value={monthOption.value}>
                      {monthOption.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mt-3 rounded-lg border border-[#f4aa24]/25 bg-[#2b1203] p-3">
                <p className="text-xs font-black uppercase tracking-widest text-white/45">
                  Selected Date
                </p>
                <p className="mt-1 font-black text-[#ffd477]">
                  {selectedDate || "NO DATE SELECTED"}
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-[#f4aa24]/35 bg-black/50 p-5 shadow-[0_18px_45px_rgba(0,0,0,0.35)]">
              <p className="mb-2 text-xs font-black uppercase tracking-widest text-[#ffd477]">
                Paste Sheet
              </p>

              <textarea
                value={paste}
                onChange={(e) => setPaste(e.target.value)}
                placeholder="Paste rows from Excel here..."
                className="h-72 w-full rounded-lg border border-[#f4aa24]/40 bg-[#1d0c02] p-4 text-sm text-white outline-none placeholder:text-white/30 focus:border-[#ffd477]"
              />

              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={buildSchedule}
                  className="rounded-lg bg-[#f4aa24] px-4 py-4 text-sm font-black uppercase tracking-widest text-[#783e12] transition hover:bg-[#ffd477]"
                >
                  {loading ? "Building..." : "Build Schedule"}
                </button>

                <button
                  type="button"
                  onClick={downloadSchedule}
                  disabled={battles.length === 0}
                  className="rounded-lg bg-[#f4aa24] px-4 py-4 text-sm font-black uppercase tracking-widest text-[#783e12] transition hover:bg-[#ffd477] disabled:opacity-40"
                >
                  Download PNG
                </button>

                <button
                  type="button"
                  onClick={clearSchedule}
                  className="rounded-lg border border-[#f4aa24]/40 bg-white/10 px-4 py-4 text-sm font-black uppercase tracking-widest text-[#ffd477] transition hover:bg-white/15 sm:col-span-2"
                >
                  Clear
                </button>
              </div>
            </div>
          </section>

          <section className="min-w-0">
            <div
              id="battle-schedule-export"
              className="mx-auto w-[900px] max-w-full overflow-visible rounded-2xl border border-[#f4aa24]/60 bg-[#150803] p-4 shadow-[0_22px_60px_rgba(0,0,0,0.45)] md:p-6"
            >
              <div className="relative overflow-hidden rounded-xl border border-[#f4aa24]/40 bg-[radial-gradient(circle_at_top,#9a5808_0%,#281004_42%,#080200_100%)] p-4 md:p-6">
                <div className="pointer-events-none absolute inset-0 opacity-20">
                  <div className="absolute left-0 top-0 h-full w-full bg-[linear-gradient(45deg,transparent_0%,rgba(255,212,119,0.18)_50%,transparent_100%)]" />
                </div>

                <div className="relative z-10 text-center">
                  <img
                    src="/honeybloom-logo.png"
                    alt="Honeybloom Agency"
                    className="mx-auto mb-2 w-full max-w-[250px]"
                  />

                  <div className="mx-auto mb-2 w-full -rotate-1 bg-white px-5 py-2 shadow-[0_8px_20px_rgba(0,0,0,0.25)]">
                    <h2
                      className="text-4xl font-black uppercase tracking-wide text-[#3a1604] md:text-6xl"
                      style={{
                        fontFamily:
                          "var(--font-luckiest-guy), 'Arial Black', Impact, sans-serif",
                      }}
                    >
                      TODAY&apos;S BATTLES
                    </h2>
                  </div>

                  <div className="mx-auto mb-5 w-fit rounded-sm bg-[#f4aa24] px-6 py-2">
                    <p
                      className="text-2xl font-black uppercase text-[#2b1003] md:text-4xl"
                      style={{
                        fontFamily:
                          "var(--font-luckiest-guy), 'Arial Black', Impact, sans-serif",
                      }}
                    >
                      {selectedDate || "SELECT A DATE"}
                    </p>
                  </div>
                </div>

                <div className="relative z-10 grid grid-cols-2 gap-3 pb-4">
                  <div className="rounded-xl border-2 border-[#f4aa24] bg-black/65 p-3 text-center">
                    <p className="text-sm font-black uppercase tracking-widest text-[#ffd477] md:text-lg">
                      Honeybloom Creators
                    </p>
                    <p className="text-xs font-black uppercase tracking-widest text-white/75 md:text-sm">
                      Representing Honey Bloom
                    </p>
                  </div>

                  <div className="rounded-xl border-2 border-[#f4aa24] bg-black/65 p-3 text-center">
                    <p className="text-sm font-black uppercase tracking-widest text-[#ffd477] md:text-lg">
                      Agency Representatives
                    </p>
                    <p className="text-xs font-black uppercase tracking-widest text-white/75 md:text-sm">
                      Their Respective Agencies
                    </p>
                  </div>
                </div>

                <div className="relative z-10 space-y-2">
                  {battles.length === 0 ? (
                    <div className="rounded-xl border-2 border-dashed border-[#f4aa24]/45 bg-black/50 p-10 text-center">
                      <p className="font-black uppercase tracking-widest text-[#ffd477]">
                        No battles generated yet
                      </p>
                      <p className="mt-2 text-sm text-white/55">
                        Pick a date, paste the sheet, then press Build Schedule.
                      </p>
                    </div>
                  ) : (
                    battles.map((battle) => (
                      <div
                        key={battle.id}
                        className="grid grid-cols-[1.35fr_110px_1.35fr] items-center gap-2 rounded-xl border border-[#f4aa24]/70 bg-black/70 p-2 shadow-[inset_0_0_18px_rgba(244,170,36,0.16)] md:grid-cols-[1.5fr_150px_1.5fr]"
                      >
                        <div className="flex min-w-0 items-center gap-2">
                          <Avatar src={battle.creatorImage} name={battle.creator} />
                          <p className="break-words text-[11px] font-black leading-tight text-white md:text-lg">
                            {displayUsername(battle.creator)}
                          </p>
                        </div>

                        <div className="rounded-lg border border-[#ffd477] bg-[#f4aa24] px-3 py-2 text-center shadow-[0_0_18px_rgba(244,170,36,0.35)]">
                          <p className="whitespace-nowrap text-base font-black text-white md:text-2xl">
                            {battle.time || "TIME"}
                          </p>
                        </div>

                        <div className="flex min-w-0 items-center justify-end gap-2">
                          <p className="break-words text-right text-[11px] font-black leading-tight text-white md:text-lg">
                            {displayUsername(battle.opponent)}
                          </p>
                          <Avatar src={battle.opponentImage} name={battle.opponent} />
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="relative z-10 mt-5 text-center">
                  <p
                    className="text-2xl font-black uppercase tracking-wide text-[#ffd477] md:text-4xl"
                    style={{
                      fontFamily:
                        "var(--font-luckiest-guy), 'Arial Black', Impact, sans-serif",
                      WebkitTextStroke: "1px #3a1604",
                    }}
                  >
                    Who will bloom tonight?
                  </p>

                  <p className="mt-1 text-sm font-black uppercase tracking-[0.2em] text-white/80 md:text-lg">
                    Tune in. Support. Show love!
                  </p>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

function Avatar({ src, name }: { src: string; name: string }) {
  return (
    <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full border border-[#f4aa24]/70 bg-black md:h-12 md:w-12">
      {src ? (
        <img
          src={src}
          alt={name}
          crossOrigin="anonymous"
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-[10px] font-black text-[#ffd477]">
          TT
        </div>
      )}
    </div>
  );
}
