"use client";
/** Dashboard home: greeting, a single stat strip (not four look-alike
 *  tiles), a live/draft hero, recent conversations, and the teach queue.
 *  All real data. */
import { useState } from "react";
import { Copy, Check, Sparkles, MessageSquare, ArrowUpRight } from "lucide-react";
import PublishButton from "./PublishButton";
import OnboardingChecklist from "./OnboardingChecklist";
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
  openSettings,
}: {
  twin: TwinRecord;
  stats: AppStats;
  sources: SourceRecord[];
  go: (v: ViewKey) => void;
  openSettings: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const origin = typeof window === "undefined" ? "https://hiy.ai" : window.location.origin;
  const firstName = twin.name.split(" ")[0];
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const isLive = twin.status === "live";
  const hasContent = sources.length > 0;
  const hasInterview = sources.some((s) => s.type === "interview");

  function copyLink() {
    navigator.clipboard?.writeText(`${origin}/${twin.slug}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const stat = [
    { label: "Conversations", value: stats.conversations.toLocaleString(), sub: `${stats.conversationsWeek} this week` },
    { label: "Messages", value: stats.messages.toLocaleString(), sub: "all time" },
    { label: "Training words", value: stats.trainingWords.toLocaleString(), sub: `${sources.length} sources` },
    { label: "Needs review", value: String(stats.needsReview), sub: "to answer", accent: stats.needsReview > 0 },
  ];

  return (
    <>
      <header className="mb-6">
        <h1 className="font-display text-3xl">
          {greeting}, {firstName}
        </h1>
        <p className="mt-1 text-sm text-inksoft">
          {stats.conversationsWeek > 0
            ? `Your hiy talked with ${stats.conversationsWeek} ${stats.conversationsWeek === 1 ? "person" : "people"} this week.`
            : isLive
              ? "Your hiy is live and ready — share your link to get talking."
              : "One step left: add content and your hiy goes live."}
        </p>
      </header>

      {/* draft → activation checklist · live → share bar (+ voice nudge) */}
      {!isLive ? (
        <OnboardingChecklist
          slug={twin.slug}
          hasContent={hasContent}
          hasInterview={hasInterview}
          sourceCount={sources.length}
          onAddContent={() => go("training")}
          onTeachVoice={() => go("refine")}
        />
      ) : (
        <>
          <div className="mb-5 flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-surface p-3 pl-5">
            <span className="flex items-center gap-2 text-sm">
              <span className="h-2 w-2 rounded-full bg-green" />
              <span className="text-inksoft">Live at</span>
              <b className="font-medium">hiy.ai/{twin.slug}</b>
            </span>
            <div className="ml-auto flex flex-wrap items-center gap-2">
              <button
                onClick={copyLink}
                className="inline-flex items-center gap-1.5 rounded-full border border-line px-3.5 py-1.5 text-xs font-medium text-inksoft transition hover:border-ink hover:text-ink"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-green" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? "Copied" : "Copy link"}
              </button>
              <button
                onClick={openSettings}
                className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium text-inksoft transition hover:text-ink"
              >
                Embed <ArrowUpRight className="h-3.5 w-3.5" />
              </button>
              <PublishButton
                publish={false}
                className="rounded-full px-3 py-1.5 text-xs font-medium text-inkfaint transition hover:text-accent"
              >
                Unpublish
              </PublishButton>
            </div>
          </div>
          {!hasInterview && (
            <button
              onClick={() => go("refine")}
              className="mb-5 flex w-full items-center gap-3 rounded-2xl border border-dashed border-accent/40 bg-accentsoft/40 px-5 py-3 text-left transition hover:bg-accentsoft"
            >
              <Sparkles className="h-4 w-4 shrink-0 text-accent" />
              <span className="text-sm text-inksoft">
                <b className="text-ink">Make it sound more like you</b> — a 2-minute voice
                interview sharpens how your hiy phrases answers.
              </span>
              <span className="ml-auto text-xs font-semibold text-accent">Start →</span>
            </button>
          )}
        </>
      )}

      {/* one stat object, four readings — not four identical cards */}
      <div className="grid grid-cols-2 divide-y divide-line rounded-2xl border border-line bg-surface sm:grid-cols-4 sm:divide-y-0 sm:divide-x">
        {stat.map((s) => (
          <div key={s.label} className="px-5 py-4">
            <p className="text-xs text-inksoft">{s.label}</p>
            <p className={`font-display mt-1 text-3xl ${s.accent ? "text-accent" : "text-ink"}`}>
              {s.value}
            </p>
            <p className="mt-0.5 text-[11px] text-inkfaint">{s.sub}</p>
          </div>
        ))}
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[1.6fr_1fr]">
        {/* recent conversations */}
        <div className="rounded-2xl border border-line bg-surface p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Recent conversations</h2>
            {stats.recent.length > 0 && (
              <button onClick={() => go("analytics")} className="text-xs font-medium text-accent hover:underline">
                View analytics
              </button>
            )}
          </div>
          {stats.recent.length === 0 ? (
            <div className="mt-3 flex flex-col items-center gap-2 rounded-xl border border-dashed border-line py-8 text-center">
              <MessageSquare className="h-5 w-5 text-inkfaint" />
              <p className="max-w-xs text-sm text-inksoft">
                {isLive
                  ? `No conversations yet — share hiy.ai/${twin.slug} and they'll show up here.`
                  : "Conversations appear here once your hiy is live."}
              </p>
            </div>
          ) : (
            <ul className="mt-1 divide-y divide-line">
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
                Answer it now
                {stats.needsReviewList.length > 1 ? ` (${stats.needsReviewList.length - 1} more)` : ""}
              </button>
            </>
          )}
        </div>
      </div>
    </>
  );
}
