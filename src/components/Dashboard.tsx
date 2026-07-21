"use client";
/** Creator dashboard shell: Profile / Knowledge / Behavior / Refine / Share. */
import { useState } from "react";
import { useRouter } from "next/navigation";
import ProfileTab from "./dashboard/ProfileTab";
import KnowledgeTab from "./dashboard/KnowledgeTab";
import BehaviorTab from "./dashboard/BehaviorTab";
import ShareTab from "./dashboard/ShareTab";
import InterviewFlow from "./InterviewFlow";
import type { TwinRecord, SourceRecord } from "./dashboard/types";

const TABS = [
  { key: "knowledge", label: "Knowledge" },
  { key: "refine", label: "Refine" },
  { key: "profile", label: "Profile" },
  { key: "behavior", label: "Behavior" },
  { key: "share", label: "Share" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export default function Dashboard({
  twin,
  sources,
  wiki,
}: {
  twin: TwinRecord;
  sources: SourceRecord[];
  wiki: string | null;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<TabKey>("knowledge");
  const hasInterview = sources.some((s) => s.type === "interview");

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <header className="mb-6 flex items-center gap-5">
        {twin.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={twin.avatar_url}
            alt=""
            className="h-14 w-14 rounded-full border border-line object-cover"
          />
        ) : (
          <div className="orb h-14 w-14" />
        )}
        <div className="flex-1">
          <h1 className="font-display text-2xl font-medium">{twin.name}&apos;s twin</h1>
          <p className="text-sm text-inksoft">
            hiy.ai/{twin.slug} ·{" "}
            <span className={twin.status === "live" ? "text-accent" : ""}>{twin.status}</span>
            {!hasInterview && (
              <>
                {" "}
                ·{" "}
                <button
                  onClick={() => setTab("refine")}
                  className="text-accent underline decoration-dotted underline-offset-2"
                >
                  interview your twin →
                </button>
              </>
            )}
          </p>
        </div>
        <a
          href={`/${twin.slug}`}
          target="_blank"
          className="rounded-full border border-line px-4 py-2 text-sm hover:border-accent"
        >
          View public page ↗
        </a>
      </header>

      <nav className="mb-6 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`rounded-full border px-4 py-2 text-sm transition ${
              tab === t.key
                ? "border-ink bg-ink text-paper"
                : "border-line text-inksoft hover:border-accent"
            }`}
          >
            {t.label}
            {t.key === "refine" && !hasInterview && (
              <span className="ml-1.5 inline-block h-1.5 w-1.5 rounded-full bg-accent2 align-middle" />
            )}
          </button>
        ))}
      </nav>

      {tab === "knowledge" && <KnowledgeTab twin={twin} sources={sources} wiki={wiki} />}
      {tab === "refine" && (
        <InterviewFlow twinId={twin.id} twinName={twin.name} onDone={() => router.refresh()} />
      )}
      {tab === "profile" && <ProfileTab twin={twin} />}
      {tab === "behavior" && <BehaviorTab twin={twin} />}
      {tab === "share" && <ShareTab twin={twin} />}
    </main>
  );
}
