import Link from "next/link";

export default function HomePage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#fff8ea] px-4 py-10">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,#fff1c8_0%,#fff8ea_45%,#f8eedb_100%)]" />

      {/* Honeycomb top left */}
      <img
        src="/honeycomb-corner.png"
        alt=""
        className="pointer-events-none absolute -left-6 -top-6 w-72 opacity-95"
        style={{
          WebkitMaskImage:
            "linear-gradient(to right, transparent 0%, black 18%, black 82%, transparent 100%), linear-gradient(to bottom, transparent 0%, black 18%, black 82%, transparent 100%)",
          WebkitMaskComposite: "source-in",
          maskImage:
            "linear-gradient(to right, transparent 0%, black 18%, black 82%, transparent 100%), linear-gradient(to bottom, transparent 0%, black 18%, black 82%, transparent 100%)",
          maskComposite: "intersect",
        }}
      />

      {/* Honeycomb bottom right */}
      <img
        src="/honeycomb-corner.png"
        alt=""
        className="pointer-events-none absolute -bottom-6 -right-6 w-80 rotate-180 opacity-95"
        style={{
          WebkitMaskImage:
            "linear-gradient(to right, transparent 0%, black 18%, black 82%, transparent 100%), linear-gradient(to bottom, transparent 0%, black 18%, black 82%, transparent 100%)",
          WebkitMaskComposite: "source-in",
          maskImage:
            "linear-gradient(to right, transparent 0%, black 18%, black 82%, transparent 100%), linear-gradient(to bottom, transparent 0%, black 18%, black 82%, transparent 100%)",
          maskComposite: "intersect",
        }}
      />

      {/* Extra soft decorations */}
      <div className="pointer-events-none absolute right-20 top-36 text-4xl text-[#efb44a]/45">
        ✦
      </div>
      <div className="pointer-events-none absolute left-12 bottom-24 text-5xl text-[#efb44a]/35">
        ✦
      </div>

      <div className="relative z-10 mx-auto flex min-h-[calc(100vh-80px)] w-full max-w-5xl flex-col items-center justify-center text-center">
        <img
          src="/honeybloom-logo.png"
          alt="Honeybloom Agency"
          className="mb-8 w-full max-w-[380px]"
        />

        <h1 className="text-5xl font-black uppercase tracking-wide text-[#783e12] drop-shadow-sm md:text-6xl">
          Honeybloom Hub
        </h1>

        <div className="my-6 flex items-center gap-4">
          <div className="h-px w-28 bg-[#e6a52b]" />
          <div className="text-[#e6a52b]">✿</div>
          <div className="h-px w-28 bg-[#e6a52b]" />
        </div>

        <p className="mb-10 text-xl font-medium text-[#783e12]/85">
          Battle poster generator.
        </p>

        <Link
          href="/generator"
          className="group w-full max-w-xl rounded-[28px] border-2 border-white/80 bg-gradient-to-br from-[#ffe7a8] via-[#ffd477] to-[#f4aa24] px-8 py-10 text-center shadow-[0_18px_45px_rgba(120,62,18,0.20)] transition hover:scale-[1.02] hover:shadow-[0_22px_55px_rgba(120,62,18,0.28)]"
        >
          <h2 className="text-3xl font-black uppercase tracking-wide text-[#783e12]">
            Poster Generator
          </h2>

          <p className="mt-4 text-lg font-medium text-[#783e12]/85">
            Create single and bulk battle posters.
          </p>
        </Link>
      </div>
    </main>
  );
}