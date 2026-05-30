"use client";

import { useEffect, useMemo, useState } from "react";

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

type DayStatus = {
  dateKey: string;
  dateLabel: string;
  hasData: boolean;
  battleCount: number;
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

function getDateKey(dayRaw: string, monthRaw: string) {
  if (!dayRaw || !monthRaw) return "";

  const day = String(Number(dayRaw)).padStart(2, "0");
  const month = String(Number(monthRaw) + 1).padStart(2, "0");

  return `${DEFAULT_YEAR}-${month}-${day}`;
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

function formatDateKeyLocal(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatDateLabelLocal(date: Date) {
  const weekday = date.toLocaleDateString("en-GB", { weekday: "long" });
  const monthName = date.toLocaleDateString("en-GB", { month: "long" });
  const day = date.getDate();

  return `${weekday} ${getOrdinal(day)} ${monthName}`;
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

export default function ScheduleAdminPage() {
  const [day, setDay] = useState("");
  const [month, setMonth] = useState("4");
  const [paste, setPaste] = useState("");
  const [battles, setBattles] = useState<Battle[]>([]);
  const [savedSchedule, setSavedSchedule] = useState<SavedSchedule | null>(null);
  const [previewLabel, setPreviewLabel] = useState("");
  const [dayStatuses, setDayStatuses] = useState<DayStatus[]>([]);
  const [loadingStatuses, setLoadingStatuses] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingSaved, setLoadingSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const selectedDate = useMemo(() => formatDateFromParts(day, month), [day, month]);
  const selectedDateKey = useMemo(() => getDateKey(day, month), [day, month]);
  const daysInMonth = getDaysInMonth(month);

  useEffect(() => {
    loadUpcomingStatuses();
  }, []);

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

  async function loadUpcomingStatuses() {
    setLoadingStatuses(true);

    const today = new Date();
    const nextDays: DayStatus[] = [];

    for (let i = 0; i <= 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);

      const dateKey = formatDateKeyLocal(date);
      const dateLabel = formatDateLabelLocal(date);

      let hasData = false;
      let battleCount = 0;

      try {
        const res = await fetch(`/api/schedule/by-date?dateKey=${dateKey}`, {
          cache: "no-store",
        });

        const json = await res.json();

        if (json.schedule?.battles?.length > 0) {
          hasData = true;
          battleCount = json.schedule.battles.length;
        }
      } catch {}

      nextDays.push({
        dateKey,
        dateLabel,
        hasData,
        battleCount,
      });
    }

    setDayStatuses(nextDays);
    setLoadingStatuses(false);
  }

  async function loadSavedPreview() {
    if (!selectedDateKey) {
      alert("Please select a date first.");
      return;
    }

    setLoadingSaved(true);

    try {
      const res = await fetch(`/api/schedule/by-date?dateKey=${selectedDateKey}`, {
        cache: "no-store",
      });

      const json = await res.json();

      if (!res.ok) {
        alert(json.error || "Failed to load saved schedule.");
        return;
      }

      if (!json.schedule) {
        setSavedSchedule(null);
        setBattles([]);
        setPreviewLabel(selectedDate);
        alert("No saved schedule found for this date.");
        return;
      }

      setSavedSchedule(json.schedule);
      setBattles(json.schedule.battles || []);
      setPreviewLabel(json.schedule.date_label || selectedDate);
    } catch {
      alert("Failed to load saved schedule.");
    } finally {
      setLoadingSaved(false);
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
    setSavedSchedule(null);
    setPreviewLabel(selectedDate);
    setLoading(false);
  }

  async function saveSchedule() {
    if (!selectedDateKey || !selectedDate) {
      alert("Please select a date first.");
      return;
    }

    if (battles.length === 0) {
      alert("Build or load a schedule before saving.");
      return;
    }

    setSaving(true);

    try {
      const res = await fetch("/api/schedule/save", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          dateKey: selectedDateKey,
          dateLabel: selectedDate,
          battles,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        alert(json.error || "Failed to save schedule.");
        return;
      }

      setPreviewLabel(selectedDate);
      alert("Schedule saved. If this date already had battles, they were overwritten.");
      await loadUpcomingStatuses();
    } catch {
      alert("Failed to save schedule.");
    } finally {
      setSaving(false);
    }
  }

  function clearSchedule() {
    setPaste("");
    setBattles([]);
    setSavedSchedule(null);
    setPreviewLabel("");
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#130903] p-4 text-white md:p-8">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,#8b4b06_0%,#2c1304_42%,#090301_100%)]" />

      <div className="relative z-10 mx-auto max-w-[1500px] space-y-6">
        <div className="flex flex-wrap gap-3">
          <a
            href="/"
            className="rounded-lg bg-[#f4aa24] px-4 py-3 font-black uppercase tracking-widest text-[#783e12] transition hover:bg-[#ffd477]"
          >
            Home
          </a>

          <a
            href="/schedule"
            className="rounded-lg border border-[#f4aa24]/50 bg-black/35 px-4 py-3 font-black uppercase tracking-widest text-[#ffd477] transition hover:border-[#ffd477]"
          >
            Public Schedule
          </a>

          <a
            href="/live/honeybloom-schedule"
            className="rounded-lg border border-[#f4aa24]/50 bg-black/35 px-4 py-3 font-black uppercase tracking-widest text-[#ffd477] transition hover:border-[#ffd477]"
          >
            No-Nav Public Link
          </a>
        </div>

        <div className="grid grid-cols-1 gap-8 xl:grid-cols-[430px_1fr]">
          <section className="space-y-5">
            <div className="rounded-2xl border border-[#f4aa24]/35 bg-black/50 p-5 shadow-[0_18px_45px_rgba(0,0,0,0.35)]">
              <h1 className="text-3xl font-black uppercase tracking-[0.16em] text-[#ffd477]">
                Upload Schedule
              </h1>

              <p className="mt-2 text-sm text-white/60">
                Pick any date to preview saved data, or paste a new sheet and save. Saving the same date overwrites the old schedule completely.
              </p>

              <div className="mt-5 rounded-xl border border-[#f4aa24]/30 bg-[#1d0c02]/85 p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <p className="text-xs font-black uppercase tracking-widest text-[#ffd477]">
                    Next 7 Days
                  </p>

                  <button
                    type="button"
                    onClick={loadUpcomingStatuses}
                    className="rounded-md border border-[#f4aa24]/40 bg-black/35 px-2 py-1 text-[10px] font-black uppercase tracking-widest text-[#ffd477] transition hover:border-[#ffd477]"
                  >
                    Refresh
                  </button>
                </div>

                {loadingStatuses ? (
                  <p className="text-sm font-black uppercase tracking-widest text-white/45">
                    Loading schedule status...
                  </p>
                ) : (
                  <div className="space-y-2">
                    {dayStatuses.map((item) => (
                      <div
                        key={item.dateKey}
                        className={`rounded-lg border px-3 py-2 ${
                          item.hasData
                            ? "border-green-400/60 bg-green-500/20"
                            : "border-[#f4aa24]/25 bg-black/35"
                        }`}
                      >
                        <p
                          className={`text-sm font-black uppercase tracking-wide ${
                            item.hasData ? "text-green-200" : "text-white/55"
                          }`}
                        >
                          {item.dateLabel}
                        </p>

                        <p
                          className={`mt-0.5 text-xs font-black uppercase tracking-widest ${
                            item.hasData ? "text-green-300" : "text-white/35"
                          }`}
                        >
                          {item.hasData
                            ? `${item.battleCount} battles uploaded`
                            : "No data"}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-[#f4aa24]/35 bg-black/50 p-5 shadow-[0_18px_45px_rgba(0,0,0,0.35)]">
              <p className="mb-2 text-xs font-black uppercase tracking-widest text-[#ffd477]">
                Date
              </p>

              <div className="grid grid-cols-2 gap-3">
                <select
                  value={day}
                  onChange={(e) => {
                    setDay(e.target.value);
                    setSavedSchedule(null);
                  }}
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
                  onChange={(e) => {
                    setMonth(e.target.value);
                    setSavedSchedule(null);
                  }}
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

              <button
                type="button"
                onClick={loadSavedPreview}
                disabled={!selectedDateKey || loadingSaved}
                className="mt-3 w-full rounded-lg bg-[#f4aa24] px-4 py-4 text-sm font-black uppercase tracking-widest text-[#783e12] transition hover:bg-[#ffd477] disabled:opacity-40"
              >
                {loadingSaved ? "Loading Saved..." : "Load Saved Preview"}
              </button>
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
                  disabled={loading}
                  className="rounded-lg bg-[#f4aa24] px-4 py-4 text-sm font-black uppercase tracking-widest text-[#783e12] transition hover:bg-[#ffd477] disabled:opacity-40"
                >
                  {loading ? "Building..." : "Build New Preview"}
                </button>

                <button
                  type="button"
                  onClick={saveSchedule}
                  disabled={battles.length === 0 || saving}
                  className="rounded-lg bg-[#8fcf68] px-4 py-4 text-sm font-black uppercase tracking-widest text-[#2f4f16] transition hover:bg-[#a8e57d] disabled:opacity-40"
                >
                  {saving ? "Saving..." : "Save / Overwrite"}
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
            <div className="rounded-2xl border border-[#f4aa24]/35 bg-black/50 p-5 shadow-[0_18px_45px_rgba(0,0,0,0.35)]">
              <h2 className="mb-2 text-xl font-black uppercase tracking-widest text-[#ffd477]">
                Preview
              </h2>

              <p className="mb-4 text-sm font-black uppercase tracking-widest text-white/60">
                {previewLabel || selectedDate || "No date selected"}
                {savedSchedule ? " • Saved schedule loaded" : ""}
              </p>

              {battles.length === 0 ? (
                <div className="rounded-xl border-2 border-dashed border-[#f4aa24]/45 bg-black/50 p-10 text-center">
                  <p className="font-black uppercase tracking-widest text-[#ffd477]">
                    No schedule loaded
                  </p>
                  <p className="mt-2 text-sm text-white/55">
                    Select a date and load saved preview, or paste rows and build a new preview.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {battles.map((battle) => (
                    <div
                      key={battle.id}
                      className="grid grid-cols-[1.35fr_110px_1.35fr] items-center gap-2 rounded-xl border border-[#f4aa24]/70 bg-black/70 p-2 md:grid-cols-[1.5fr_150px_1.5fr]"
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <Avatar src={battle.creatorImage} name={battle.creator} />
                        <p className="break-words text-[11px] font-black leading-tight text-white md:text-lg">
                          {displayUsername(battle.creator)}
                        </p>
                      </div>

                      <div className="rounded-lg border border-[#ffd477] bg-[#f4aa24] px-3 py-2 text-center">
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
                  ))}
                </div>
              )}
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