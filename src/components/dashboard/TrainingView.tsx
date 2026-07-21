"use client";
/** Training per "Hiy Mockups" §3b: words bar, sources table, add-source
 *  panel (single + bulk), wiki viewer + corrections, persona row. */
import { useState } from "react";
import { useRouter } from "next/navigation";
import KnowledgeTab from "./KnowledgeTab";
import type { TwinRecord, SourceRecord, AppStats } from "./types";

const TYPE_ICONS: Record<string, { label: string; cls: string }> = {
  youtube: { label: "YT", cls: "bg-[#e5484d] text-white" },
  blog: { label: "WEB", cls: "bg-[#3a7bd5] text-white" },
  file: { label: "PDF", cls: "bg-[#7c5cbf] text-white" },
  manual: { label: "TXT", cls: "bg-surface2 text-inksoft" },
  linkedin: { label: "CV", cls: "bg-surface2 text-inksoft" },
  interview: { label: "INT", cls: "bg-accentsoft text-accent" },
  correction: { label: "FIX", cls: "bg-accentsoft text-accent" },
};

// Free-tier words cap mirrors caps.ts defaults; server stays authoritative.
const WORDS_CAP = 10_000;

export default function TrainingView({
  twin,
  sources,
  wiki,
  stats,
  goRefine,
}: {
  twin: TwinRecord;
  sources: SourceRecord[];
  wiki: string | null;
  stats: AppStats;
  goRefine: () => void;
}) {
  const router = useRouter();
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState("");
  const pct = Math.min(100, Math.round((stats.trainingWords / WORDS_CAP) * 100));

  async function remove(id: string) {
    setDeleting(id);
    setError("");
    try {
      const res = await fetch("/api/source", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ twinId: twin.id, sourceId: id }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? "Delete failed.");
      }
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setDeleting(null);
    }
  }

  return (
    <>
      <header className="mb-6">
        <h1 className="font-display text-3xl">Training</h1>
        <p className="mt-1 text-sm text-inksoft">
          Everything your hiy knows, and where it learned it.
        </p>
      </header>

      {/* words bar */}
      <div className="rounded-2xl border border-line bg-surface p-4">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold">Training words used</span>
          <span className="text-inkfaint">
            {stats.trainingWords.toLocaleString()} / {WORDS_CAP.toLocaleString()} · Starter plan
          </span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface2">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#d97748] to-accent"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* sources table */}
      <div className="mt-4 overflow-hidden rounded-2xl border border-line bg-surface">
        <div className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-3 border-b border-line px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-inkfaint">
          <span>Source</span>
          <span>Type</span>
          <span className="text-right">Words</span>
          <span />
        </div>
        {sources.length === 0 ? (
          <p className="px-4 py-6 text-sm text-inkfaint">
            Nothing yet — add your first source below and your hiy goes live.
          </p>
        ) : (
          sources.map((s) => {
            const icon = TYPE_ICONS[s.type] ?? TYPE_ICONS.manual;
            return (
              <div
                key={s.id}
                className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-3 border-b border-line px-4 py-3 text-sm last:border-0"
              >
                <span className="flex min-w-0 items-center gap-2.5">
                  <span
                    className={`flex h-7 w-9 shrink-0 items-center justify-center rounded-md text-[9px] font-bold ${icon.cls}`}
                  >
                    {icon.label}
                  </span>
                  <span className="truncate font-medium">{s.title}</span>
                </span>
                <span className="text-xs text-inkfaint">{s.type}</span>
                <span className="text-right text-xs text-inkfaint">
                  {s.word_count.toLocaleString()}
                </span>
                <button
                  onClick={() => remove(s.id)}
                  disabled={deleting === s.id}
                  className="text-xs text-inkfaint transition hover:text-accent disabled:opacity-40"
                >
                  {deleting === s.id ? "…" : "remove"}
                </button>
              </div>
            );
          })
        )}
      </div>
      {error && <p className="mt-2 text-xs text-accent">{error}</p>}

      {/* persona & guardrails row */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-surface p-4">
        <div>
          <p className="text-sm font-semibold">Persona &amp; guardrails</p>
          <p className="mt-0.5 text-xs text-inksoft">
            {twin.guardrail_topics?.length
              ? `Off-limits: ${twin.guardrail_topics.slice(0, 3).join(" · ")}${twin.guardrail_topics.length > 3 ? "…" : ""}`
              : "Interview your hiy so it phrases things the way you would."}
          </p>
        </div>
        <button
          onClick={goRefine}
          className="rounded-full border border-line px-4 py-2 text-xs font-semibold transition hover:border-accent hover:text-accent"
        >
          {sources.some((s) => s.type === "interview") ? "Re-run interview" : "Start interview"}
        </button>
      </div>

      {/* add sources: the full existing panel (single, bulk, wiki, corrections) */}
      <div className="mt-6">
        <KnowledgeTab twin={twin} sources={[]} wiki={wiki} hideList />
      </div>
    </>
  );
}
