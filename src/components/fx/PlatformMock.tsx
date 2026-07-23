/**
 * Stripe-style product mockup: a browser-framed dashboard + a floating
 * phone-framed twin page, built from the app's real UI vocabulary (tokens,
 * chips, bars) so it always matches the current theme. Animated on view:
 * bars grow, conversation rows cascade, the phone floats.
 */
import OnView from "./OnView";
import type { CSSProperties } from "react";

const BARS = [5, 8, 6, 10, 7, 11, 9, 13, 10, 14, 12, 16];

const CONVERSATIONS = [
  { q: "How do I price my first product?", t: "2 min ago" },
  { q: "What does chapter four say about sugar?", t: "14 min ago" },
  { q: "Do you take 1:1 clients right now?", t: "1 hr ago" },
];

export default function PlatformMock() {
  return (
    <OnView className="relative mx-auto max-w-4xl">
      {/* browser frame — the creator dashboard */}
      <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-[0_2px_10px_rgba(10,37,64,.06),0_32px_80px_rgba(10,37,64,.12)]">
        {/* chrome bar */}
        <div className="flex items-center gap-2 border-b border-line bg-paper px-4 py-2.5">
          <span className="flex gap-1.5" aria-hidden>
            <i className="h-2.5 w-2.5 rounded-full bg-[#fc605c]" />
            <i className="h-2.5 w-2.5 rounded-full bg-[#fdbc40]" />
            <i className="h-2.5 w-2.5 rounded-full bg-[#34c648]" />
          </span>
          <span className="mx-auto rounded-full bg-surface px-4 py-1 text-[11px] text-inkfaint">
            hiy.ai/app
          </span>
          <span className="w-10" aria-hidden />
        </div>

        <div className="flex">
          {/* mini rail */}
          <div className="hidden w-40 shrink-0 border-r border-line bg-surface p-3 sm:block">
            <p className="px-2 text-sm font-bold">
              hiy<span className="text-accent">.ai</span>
            </p>
            <div className="mt-3 space-y-1">
              {["Dashboard", "Training", "Refine", "Analytics"].map((n, i) => (
                <p
                  key={n}
                  className={`rounded-md px-2 py-1.5 text-[11px] ${
                    i === 0 ? "bg-paper font-semibold text-ink" : "text-inksoft"
                  }`}
                >
                  {n}
                </p>
              ))}
            </div>
            <p className="mt-6 flex items-center gap-1.5 px-2 text-[10px] text-inksoft">
              <span className="h-1.5 w-1.5 rounded-full bg-green" /> Live · hiy.ai/maya
            </p>
          </div>

          {/* content */}
          <div className="min-w-0 flex-1 p-5">
            <p className="text-sm font-bold">Good morning, Maya</p>
            <p className="text-[11px] text-inksoft">Your hiy talked with 34 people this week.</p>

            {/* stat strip */}
            <div className="mt-3 grid grid-cols-3 divide-x divide-line rounded-xl border border-line">
              {[
                ["Conversations", "412"],
                ["Cited answers", "96%"],
                ["Leads", "23"],
              ].map(([l, v]) => (
                <div key={l} className="px-3 py-2.5">
                  <p className="text-[10px] text-inksoft">{l}</p>
                  <p className="text-lg font-bold tracking-tight">{v}</p>
                </div>
              ))}
            </div>

            {/* activity bars */}
            <div className="mt-3 flex h-16 items-end justify-between rounded-xl border border-line px-4 py-3">
              {BARS.map((h, i) => (
                <span
                  key={i}
                  className="ov-bar w-2 rounded-full bg-accent/70 sm:w-2.5"
                  style={{ height: `${h * 3.2}px`, "--i": i } as CSSProperties}
                />
              ))}
            </div>

            {/* recent conversations */}
            <div className="mt-3 space-y-1.5">
              {CONVERSATIONS.map((c, i) => (
                <div
                  key={c.q}
                  className="ov-chip flex items-center gap-2 rounded-lg border border-line px-3 py-2"
                  style={{ "--i": i + 3 } as CSSProperties}
                >
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent/60" />
                  <p className="min-w-0 flex-1 truncate text-[11px]">&ldquo;{c.q}&rdquo;</p>
                  <span className="shrink-0 text-[10px] text-inkfaint">{c.t}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* floating phone — the public twin page */}
      <div
        className="absolute -right-4 top-10 hidden w-56 rounded-[2rem] border border-line bg-surface p-3 shadow-[0_18px_60px_rgba(10,37,64,.18)] md:block"
        style={{ animation: "artifact-float 8s ease-in-out infinite" }}
      >
        <div className="mx-auto mb-2 h-1 w-12 rounded-full bg-line" aria-hidden />
        <div className="flex flex-col items-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-accent text-sm font-bold text-white">
            MC
          </span>
          <p className="mt-1.5 text-sm font-bold">Maya Chen</p>
          <p className="text-[10px] text-inkfaint">Startup coach</p>
        </div>
        <div className="mt-3 space-y-2">
          <p className="ml-auto w-fit max-w-[90%] rounded-xl rounded-br-sm bg-dark px-2.5 py-1.5 text-[10px] text-white">
            Raise or bootstrap?
          </p>
          <div className="w-fit max-w-[95%] rounded-xl rounded-bl-sm bg-paper px-2.5 py-1.5 text-[10px] leading-relaxed">
            Bootstrap until it sells without you in the room.
            <span className="chip-cite mt-1 block w-fit !text-[8.5px]">⌘ Ep. 12</span>
          </div>
        </div>
        <div className="mt-3 rounded-full border border-line px-3 py-1.5 text-[9px] text-inkfaint">
          Ask Maya anything…
        </div>
      </div>
    </OnView>
  );
}
