"use client";
/** Analytics per "Hiy Mockups" §3c — real data from chat_sessions/messages:
 *  conversations/day (14d), top questions, the knowledge-gap queue. */
import type { AppStats } from "./types";

export default function AnalyticsView({ stats }: { stats: AppStats }) {
  const max = Math.max(1, ...stats.days.map((d) => d.count));

  return (
    <>
      <header className="mb-6">
        <h1 className="font-display text-3xl">Analytics</h1>
        <p className="mt-1 text-sm text-inksoft">
          What your people ask, and how your hiy performs. Last 14 days.
        </p>
      </header>

      {/* conversations per day */}
      <div className="rounded-2xl border border-line bg-surface p-5">
        <h2 className="text-sm font-semibold">Conversations per day</h2>
        {stats.days.every((d) => d.count === 0) ? (
          <p className="mt-4 text-sm text-inkfaint">
            No conversations in the last 14 days — share your link to see this fill up.
          </p>
        ) : (
          <div className="mt-5 flex h-40 items-end gap-1.5">
            {stats.days.map((d, i) => (
              <div key={d.day} className="group relative flex-1">
                <div
                  className="bar-grow w-full rounded-t-md bg-gradient-to-t from-accent to-[#d97748] transition group-hover:brightness-110"
                  style={{
                    height: `${Math.max(3, (d.count / max) * 152)}px`,
                    animationDelay: `${i * 40}ms`,
                  }}
                  title={`${d.label}: ${d.count}`}
                />
              </div>
            ))}
          </div>
        )}
        <div className="mt-2 flex justify-between text-[10px] text-inkfaint">
          <span>{stats.days[0]?.label}</span>
          <span>{stats.days[Math.floor(stats.days.length / 2)]?.label}</span>
          <span>{stats.days[stats.days.length - 1]?.label}</span>
        </div>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        {/* top questions */}
        <div className="rounded-2xl border border-line bg-surface p-5">
          <h2 className="text-sm font-semibold">Top questions</h2>
          {stats.topQuestions.length === 0 ? (
            <p className="mt-3 text-sm text-inkfaint">Nothing yet.</p>
          ) : (
            <ul className="mt-2 divide-y divide-line">
              {stats.topQuestions.map((q) => (
                <li key={q.question} className="flex items-center gap-3 py-2.5 text-sm">
                  <span className="min-w-0 flex-1 truncate">{q.question}</span>
                  <span className="shrink-0 text-xs font-bold text-accent">{q.count}×</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* knowledge gaps */}
        <div className="rounded-2xl border border-line bg-surface p-5">
          <h2 className="text-sm font-semibold">Knowledge gaps</h2>
          <p className="mt-0.5 text-xs text-inkfaint">
            Questions your hiy honestly couldn&apos;t answer — teach it these.
          </p>
          {stats.needsReviewList.length === 0 ? (
            <p className="mt-3 text-sm text-inkfaint">None — your hiy is keeping up.</p>
          ) : (
            <ul className="mt-2 divide-y divide-line">
              {stats.needsReviewList.slice(0, 6).map((q) => (
                <li key={q.question} className="py-2.5 text-sm">
                  <span className="chip-idk mr-2">gap</span>
                  {q.question}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <p className="mt-5 rounded-2xl bg-accentsoft px-4 py-3 text-xs text-accentdeep">
        <b>Coming with the growth phase:</b> visitor sources (direct / widget / deep links), voice
        analytics, and weekly email digests.
      </p>
    </>
  );
}
