"use client";
/**
 * Creator app shell — claude.ai/chatgpt-style: light/dark neutral rail,
 * lucide icons, a subtle selected state. Product features (Behavior,
 * Share & embed) are sidebar views; account-level things (Profile, Plan,
 * appearance) live in the account menu.
 */
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  LayoutGrid,
  PenLine,
  Sparkles,
  BarChart3,
  SlidersHorizontal,
  Share2,
  Settings as SettingsIcon,
  CreditCard,
  ExternalLink,
  LogOut,
  ChevronsUpDown,
  Sun,
  Moon,
  Menu,
  X,
} from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { currentTheme, toggleTheme, type Theme } from "@/lib/theme";
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
import BehaviorTab from "./dashboard/BehaviorTab";
import ShareTab from "./dashboard/ShareTab";
import SettingsDialog from "./dashboard/SettingsDialog";
import PlanDialog from "./dashboard/PlanDialog";
import InterviewFlow from "./InterviewFlow";
import type { TwinRecord, SourceRecord, AppStats } from "./dashboard/types";

const NAV = [
  { key: "home", label: "Dashboard", Icon: LayoutGrid },
  { key: "training", label: "Training", Icon: PenLine },
  { key: "refine", label: "Refine", Icon: Sparkles },
  { key: "analytics", label: "Analytics", Icon: BarChart3 },
  { key: "behavior", label: "Behavior", Icon: SlidersHorizontal },
  { key: "share", label: "Share & embed", Icon: Share2 },
] as const;

export type ViewKey = (typeof NAV)[number]["key"];

const VIEW_TITLE: Record<Exclude<ViewKey, "home">, string> = {
  training: "Training",
  refine: "Refine",
  analytics: "Analytics",
  behavior: "Behavior",
  share: "Share & embed",
};

const VIEW_SUB: Partial<Record<ViewKey, string>> = {
  behavior: "How your hiy greets, what it suggests, and where it draws the line.",
  share: "Your public link, deep links, and the embeddable widget.",
};

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
  const [navOpen, setNavOpen] = useState(false); // mobile drawer
  const [theme, setThemeState] = useState<Theme>("light");
  useEffect(() => setThemeState(currentTheme()), []);
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
    <main className="wash-dawn flex min-h-screen bg-paper">
      {/* mobile top bar */}
      <header className="fixed inset-x-0 top-0 z-30 flex items-center justify-between border-b border-line bg-surface px-4 py-3 lg:hidden">
        <button
          onClick={() => setNavOpen(true)}
          aria-label="Open menu"
          className="flex h-9 w-9 items-center justify-center rounded-lg text-inksoft transition hover:bg-paper"
        >
          <Menu className="h-5 w-5" />
        </button>
        <Link href="/" className="font-display text-lg">
          hiy<span className="text-accent">.ai</span>
        </Link>
        <span className="h-9 w-9">{avatar}</span>
      </header>

      {/* backdrop (mobile, when drawer open) */}
      {navOpen && (
        <div
          className="fixed inset-0 z-40 bg-ink/40 backdrop-blur-[1px] lg:hidden"
          onClick={() => setNavOpen(false)}
          aria-hidden
        />
      )}

      {/* rail — static on desktop, slide-in drawer on mobile */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex h-screen w-64 flex-col border-r border-line bg-surface transition-transform duration-200 lg:sticky lg:top-0 lg:z-auto lg:w-60 lg:translate-x-0 ${
          navOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between px-5 pb-5 pt-5">
          <Link href="/" className="font-display text-xl" onClick={() => setNavOpen(false)}>
            hiy<span className="text-accent">.ai</span>
          </Link>
          <button
            onClick={() => setNavOpen(false)}
            aria-label="Close menu"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-inksoft transition hover:bg-paper lg:hidden"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="flex flex-1 flex-col gap-0.5 px-3">
          {NAV.map(({ key, label, Icon }) => {
            const active = view === key;
            return (
              <button
                key={key}
                onClick={() => {
                  setView(key);
                  setNavOpen(false);
                }}
                className={`group flex items-center gap-3 rounded-lg px-2.5 py-2.5 text-left text-sm transition ${
                  active
                    ? "bg-paper font-medium text-ink"
                    : "text-inksoft hover:bg-paper/70 hover:text-ink"
                }`}
              >
                <Icon
                  className={`h-[18px] w-[18px] shrink-0 ${active ? "text-accent" : "text-inkfaint group-hover:text-inksoft"}`}
                  strokeWidth={2}
                />
                <span>{label}</span>
                {key === "refine" && !hasInterview && (
                  <span className="ml-auto h-1.5 w-1.5 rounded-full bg-accent" />
                )}
                {key === "home" && stats.needsReview > 0 && (
                  <span className="ml-auto rounded-full bg-accent px-1.5 text-[10px] font-bold text-white">
                    {stats.needsReview}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* status pill */}
        <div className="px-3 pb-2">
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
        <div className="border-t border-line p-3">
          <DropdownMenu>
            <DropdownMenuTrigger className="flex w-full items-center gap-2.5 rounded-lg px-1.5 py-1.5 text-left transition hover:bg-paper focus:outline-none">
              {avatar}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-ink">{twin.name}</p>
                <p className="truncate text-xs text-inkfaint">Starter · free</p>
              </div>
              <ChevronsUpDown className="h-4 w-4 shrink-0 text-inkfaint" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" side="top" className="w-60">
              <DropdownMenuLabel>Signed in as {firstName}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => setSettingsOpen(true)}>
                <SettingsIcon className="h-4 w-4 text-inksoft" />
                Profile &amp; settings
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
              {/* appearance — flips inline, keeps the menu open */}
              <DropdownMenuItem
                onSelect={(e) => {
                  e.preventDefault();
                  setThemeState(toggleTheme());
                }}
              >
                {theme === "dark" ? (
                  <Sun className="h-4 w-4 text-inksoft" />
                ) : (
                  <Moon className="h-4 w-4 text-inksoft" />
                )}
                {theme === "dark" ? "Light mode" : "Dark mode"}
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={signOut} className="text-accent focus:bg-accentsoft">
                <LogOut className="h-4 w-4" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      {/* content — extra top padding on mobile to clear the fixed top bar */}
      <section className="min-w-0 flex-1 px-5 pb-8 pt-20 sm:px-8 lg:pt-8">
        <div className="mx-auto max-w-4xl">
          {view !== "home" && view !== "refine" && (
            <header className="mb-6">
              <h1 className="font-display text-3xl">{VIEW_TITLE[view]}</h1>
              {VIEW_SUB[view] && <p className="mt-1 text-sm text-inksoft">{VIEW_SUB[view]}</p>}
            </header>
          )}

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
          {view === "behavior" && <BehaviorTab twin={twin} />}
          {view === "share" && <ShareTab twin={twin} />}
        </div>
      </section>

      <SettingsDialog twin={twin} open={settingsOpen} onOpenChange={setSettingsOpen} />
      <PlanDialog open={planOpen} onOpenChange={setPlanOpen} />
    </main>
  );
}
