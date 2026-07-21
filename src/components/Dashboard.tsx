"use client";
/** Creator app shell per "Hiy Mockups" §3: dark sidebar + warm content. */
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import DashboardHome from "./dashboard/DashboardHome";
import TrainingView from "./dashboard/TrainingView";
import AnalyticsView from "./dashboard/AnalyticsView";
import SettingsView from "./dashboard/SettingsView";
import InterviewFlow from "./InterviewFlow";
import type { TwinRecord, SourceRecord, AppStats } from "./dashboard/types";

const NAV = [
  { key: "home", label: "Dashboard", icon: "▦" },
  { key: "training", label: "Training", icon: "✎" },
  { key: "refine", label: "Refine", icon: "◈" },
  { key: "analytics", label: "Analytics", icon: "◔" },
  { key: "settings", label: "Settings", icon: "⚙" },
] as const;

export type ViewKey = (typeof NAV)[number]["key"];

export default function Dashboard({
  twin,
  sources,
  wiki,
  stats,
}: {
  twin: TwinRecord;
  sources: SourceRecord[];
  wiki: string | null;
  stats: AppStats;
}) {
  const router = useRouter();
  const [view, setView] = useState<ViewKey>("home");
  const hasInterview = sources.some((s) => s.type === "interview");

  return (
    <main className="flex min-h-screen">
      {/* sidebar */}
      <aside className="sticky top-0 flex h-screen w-16 shrink-0 flex-col bg-dark text-white lg:w-56">
        <Link href="/" className="font-display px-5 pb-6 pt-6 text-xl hidden lg:block">
          hiy<span className="text-accent">.ai</span>
        </Link>
        <span className="font-display px-5 pb-6 pt-6 text-xl lg:hidden">h</span>
        <nav className="flex flex-1 flex-col gap-1 px-3">
          {NAV.map((n) => (
            <button
              key={n.key}
              onClick={() => setView(n.key)}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[13px] transition ${
                view === n.key
                  ? "bg-white/10 font-semibold text-white"
                  : "text-white/55 hover:bg-white/5 hover:text-white"
              }`}
            >
              <span aria-hidden className="w-4 text-center">{n.icon}</span>
              <span className="hidden lg:inline">{n.label}</span>
              {n.key === "refine" && !hasInterview && (
                <span className="ml-auto hidden h-1.5 w-1.5 rounded-full bg-accent lg:block" />
              )}
              {n.key === "home" && stats.needsReview > 0 && (
                <span className="ml-auto hidden rounded-full bg-accent px-1.5 text-[10px] font-bold lg:block">
                  {stats.needsReview}
                </span>
              )}
            </button>
          ))}
        </nav>
        <div className="hidden px-4 pb-3 lg:block">
          <Link
            href="/pricing"
            className="block rounded-xl bg-gradient-to-br from-[#3a3129] to-[#2a241e] px-4 py-3 text-xs text-white/70 transition hover:text-white"
          >
            <b className="block text-white">Free while we launch</b>
            See what paid tiers will add →
          </Link>
        </div>
        <div className="flex items-center gap-2.5 border-t border-white/10 px-4 py-4">
          {twin.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={twin.avatar_url} alt="" className="h-8 w-8 rounded-full object-cover" />
          ) : (
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent font-display text-xs">
              {twin.name.slice(0, 1)}
            </span>
          )}
          <div className="hidden min-w-0 lg:block">
            <p className="truncate text-xs font-semibold">{twin.name}</p>
            <p className="text-[10px] text-white/50">Starter plan</p>
          </div>
        </div>
      </aside>

      {/* content */}
      <section className="min-w-0 flex-1 px-5 py-8 sm:px-8">
        <div className="mx-auto max-w-4xl">
          {view === "home" && (
            <DashboardHome twin={twin} stats={stats} sources={sources} go={(v) => setView(v)} />
          )}
          {view === "training" && (
            <TrainingView
              twin={twin}
              sources={sources}
              wiki={wiki}
              stats={stats}
              goRefine={() => setView("refine")}
            />
          )}
          {view === "refine" && (
            <InterviewFlow twinId={twin.id} twinName={twin.name} onDone={() => router.refresh()} />
          )}
          {view === "analytics" && <AnalyticsView stats={stats} />}
          {view === "settings" && <SettingsView twin={twin} />}
        </div>
      </section>
    </main>
  );
}
