"use client";
/** Dashboard home per "Hiy Mockups" §3a: greeting, stat tiles, recent
 *  conversations, share card, teach-your-hiy queue. All real data. */
import { useState } from "react";
import type { TwinRecord, SourceRecord, AppStats } from "./types";
import type { ViewKey } from "../Dashboard";

function timeAgo(iso: string): string {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 3600) return `${Math.max(1, Math.round(s / 60))} min ago`;
  if (s < 86400) return `${Math.round(s / 3600)} hr ago`;
  return `${Math.round(s / 86400)}d ago`;
}

export default function DashboardHome({
  twin,
  stats,
  sources,
  go,
}: {
  twin: TwinRecord;
  stats: AppStats;
  sources: SourceRecord[];
  go: (v: ViewKey) => void;
}) {
  const [copied, setCopied] = useState(false);
  const origin = typeof window === "undefined" ? "https://hiy.ai" : window.location.origin;
  const firstName = twin.name.split(" ")[0];
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  const tiles = [
    { label: "Conversations", value: stats.conversations.toLocaleString(), sub: `${stats.conversationsWeek} this week` },
    { label: "Messages", value: stats.messages.toLocaleString(), sub: "all time" },
    { label: "Training words", value: stats.trainingWords.toLocaleString(), sub: `${sources.length} sources` },
    { label: "Needs review", value: String(stats.needsReview), sub: "unanswered questions", accent: stats.needsReview > 0 },
  ];

  return (
    <>
      <header className="mb-7 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl">
            {greeting}, {firstName}
          </h1>
          <p className="mt-1 text-sm text-inksoft">
            {stats.conversationsWeek > 0
              ? `Your hiy talked with ${stats.conversationsWeek} ${stats.conversationsWeek === 1 ? "person" : "people"} this week.`
              : "Share your link — your hiy is ready to talk."}
          </p>
        </div>
        <a
          href={`/${twin.slug}`}
          target="_blank"
          className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold ${
            twin.status === "live"
              ? "bg-greensoft text-green"
              : "border border-line text-inksoft"
          }`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${twin.status === "live" ? "bg-green" : "bg-inkfaint"}`} />
          {twin.status === "live" ? `Live at hiy.ai/${twin.slug}` : `Draft — add content to go live`}
        </a>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {tiles.map((t, i) => (
          <div
            key={t.label}
            className={`anim-fade-up rounded-2xl border border-line bg-surface p-4 ${["d1", "d2", "d3", "d4"][i]}`}
          >
            <p className="text-xs text-inksoft">{t.label}</p>
            <p className={`font-display mt-1.5 text-3xl ${t.accent ? "text-accent" : ""}`}>{t.value}</p>
            <p className="mt-1 text-[11px] text-inkfaint">{t.sub}</p>
          </div>
        ))}
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[1.5fr_1fr]">
        {/* recent conversations */}
        <div className="rounded-2xl border border-line bg-surface p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Recent conversations</h2>
            <button onClick={() => go("analytics")} className="text-xs font-medium text-accent">
              View analytics
            </button>
          </div>
          {stats.recent.length === 0 ? (
            <p className="mt-4 text-sm text-inkfaint">
              No conversations yet — share hiy.ai/{twin.slug} to start.
            </p>
          ) : (
            <ul className="mt-2 divide-y divide-line">
              {stats.recent.map((c) => (
                <li key={c.id} className="flex items-center gap-3 py-3">
                  <span className="h-2 w-2 shrink-0 rounded-full bg-accent/60" />
                  <p className="min-w-0 flex-1 truncate text-sm">&ldquo;{c.question}&rdquo;</p>
                  <span className="shrink-0 text-[11px] text-inkfaint">
                    {c.messages} messages · {timeAgo(c.at)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="space-y-5">
          {/* share card */}
          <div className="rounded-2xl bg-dark p-5 text-white">
            <h2 className="text-sm font-semibold">Share your hiy</h2>
            <div className="mt-3 flex items-center gap-2 rounded-xl bg-white/10 px-3.5 py-2.5">
              <span className="min-w-0 flex-1 truncate text-sm">hiy.ai/{twin.slug}</span>
              <button
                onClick={() => {
                  navigator.clipboard?.writeText(`${origin}/${twin.slug}`);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                }}
                className="rounded-lg bg-white px-3 py-1 text-xs font-semibold text-dark"
              >
                {copied ? "✓" : "Copy"}
              </button>
            </div>
            <button onClick={() => go("settings")} className="mt-2.5 text-xs text-white/60 hover:text-white">
              Or embed the widget on your site →
            </button>
          </div>

          {/* teach queue */}
          <div className="rounded-2xl border border-line bg-surface p-5">
            <h2 className="text-sm font-semibold">Teach your hiy</h2>
            {stats.needsReviewList.length === 0 ? (
              <p className="mt-2 text-sm text-inkfaint">
                Nothing unanswered — your hiy is keeping up.
              </p>
            ) : (
              <>
                <p className="mt-2 text-sm text-inksoft">
                  It couldn&apos;t answer{" "}
                  <b className="text-accent">&ldquo;{stats.needsReviewList[0].question}&rdquo;</b>
                </p>
                <button
                  onClick={() => go("refine")}
                  className="mt-3 w-full rounded-full border border-accent px-4 py-2 text-xs font-semibold text-accent transition hover:bg-accentsoft"
                >
                  Answer it now{stats.needsReviewList.length > 1 ? ` (${stats.needsReviewList.length - 1} more)` : ""}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
