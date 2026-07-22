"use client";
/**
 * Creator app shell — claude.ai/chatgpt-style: light neutral rail, lucide
 * icons, a subtle selected state, and an account menu that opens Settings
 * and Plan as popovers instead of full pages.
 */
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  LayoutGrid,
  PenLine,
  Sparkles,
  BarChart3,
  Settings as SettingsIcon,
  CreditCard,
  ExternalLink,
  LogOut,
  ChevronsUpDown,
} from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase/client";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import DashboardHome from "./dashboard/DashboardHome";
import TrainingView from "./dashboard/TrainingView";
import AnalyticsView from "./dashboard/AnalyticsView";
import SettingsDialog from "./dashboard/SettingsDialog";
import PlanDialog from "./dashboard/PlanDialog";
import InterviewFlow from "./InterviewFlow";
import type { TwinRecord, SourceRecord, AppStats } from "./dashboard/types";

const NAV = [
  { key: "home", label: "Dashboard", Icon: LayoutGrid },
  { key: "training", label: "Training", Icon: PenLine },
  { key: "refine", label: "Refine", Icon: Sparkles },
  { key: "analytics", label: "Analytics", Icon: BarChart3 },
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
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [planOpen, setPlanOpen] = useState(false);
  const hasInterview = sources.some((s) => s.type === "interview");
  const firstName = twin.name.split(" ")[0];

  async function signOut() {
    await supabaseBrowser().auth.signOut();
    router.push("/");
    router.refresh();
  }

  const avatar = twin.avatar_url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={twin.avatar_url} alt="" className="h-8 w-8 rounded-full object-cover" />
  ) : (
    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent font-display text-sm text-white">
      {twin.name.slice(0, 1)}
    </span>
  );

  return (
    <main className="flex min-h-screen bg-paper">
      {/* rail */}
      <aside className="sticky top-0 flex h-screen w-16 shrink-0 flex-col border-r border-line bg-surface lg:w-60">
        <div className="flex items-center gap-2 px-4 pb-5 pt-5 lg:px-5">
          <Link href="/" className="font-display text-xl">
            hiy<span className="text-accent">.ai</span>
          </Link>
        </div>

        <nav className="flex flex-1 flex-col gap-0.5 px-2.5 lg:px-3">
          {NAV.map(({ key, label, Icon }) => {
            const active = view === key;
            return (
              <button
                key={key}
                onClick={() => setView(key)}
                className={`group flex items-center gap-3 rounded-lg px-2.5 py-2 text-left text-sm transition ${
                  active
                    ? "bg-paper font-medium text-ink"
                    : "text-inksoft hover:bg-paper/70 hover:text-ink"
                }`}
              >
                <Icon
                  className={`h-[18px] w-[18px] shrink-0 ${active ? "text-accent" : "text-inkfaint group-hover:text-inksoft"}`}
                  strokeWidth={2}
                />
                <span className="hidden lg:inline">{label}</span>
                {key === "refine" && !hasInterview && (
                  <span className="ml-auto hidden h-1.5 w-1.5 rounded-full bg-accent lg:block" />
                )}
                {key === "home" && stats.needsReview > 0 && (
                  <span className="ml-auto hidden rounded-full bg-accent px-1.5 text-[10px] font-bold text-white lg:block">
                    {stats.needsReview}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* status pill */}
        <div className="hidden px-3 pb-2 lg:block">
          <a
            href={`/${twin.slug}`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs text-inksoft transition hover:bg-paper"
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${twin.status === "live" ? "bg-green" : "bg-inkfaint"}`}
            />
            {twin.status === "live" ? (
              <>Live · <span className="truncate">hiy.ai/{twin.slug}</span></>
            ) : (
              "Draft — not public yet"
            )}
          </a>
        </div>

        {/* account menu */}
        <div className="border-t border-line p-2.5 lg:p-3">
          <DropdownMenu>
            <DropdownMenuTrigger className="flex w-full items-center gap-2.5 rounded-lg px-1.5 py-1.5 text-left transition hover:bg-paper focus:outline-none">
              {avatar}
              <div className="hidden min-w-0 flex-1 lg:block">
                <p className="truncate text-sm font-medium text-ink">{twin.name}</p>
                <p className="truncate text-xs text-inkfaint">Starter · free</p>
              </div>
              <ChevronsUpDown className="hidden h-4 w-4 shrink-0 text-inkfaint lg:block" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" side="top" className="w-60">
              <DropdownMenuLabel>Signed in as {firstName}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => setSettingsOpen(true)}>
                <SettingsIcon className="h-4 w-4 text-inksoft" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setPlanOpen(true)}>
                <CreditCard className="h-4 w-4 text-inksoft" />
                Plan &amp; billing
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <a href={`/${twin.slug}`} target="_blank" rel="noreferrer">
                  <ExternalLink className="h-4 w-4 text-inksoft" />
                  View public page
                </a>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={signOut} className="text-accent focus:bg-accentsoft">
                <LogOut className="h-4 w-4" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      {/* content */}
      <section className="min-w-0 flex-1 px-5 py-8 sm:px-8">
        <div className="mx-auto max-w-4xl">
          {view === "home" && (
            <DashboardHome
              twin={twin}
              stats={stats}
              sources={sources}
              go={(v) => setView(v)}
              openSettings={() => setSettingsOpen(true)}
            />
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
        </div>
      </section>

      <SettingsDialog twin={twin} open={settingsOpen} onOpenChange={setSettingsOpen} />
      <PlanDialog open={planOpen} onOpenChange={setPlanOpen} />
    </main>
  );
}
