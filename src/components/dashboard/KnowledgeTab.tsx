"use client";
/**
 * Knowledge tab: add single sources (the original 5-way form), bulk import,
 * source list with delete, read-only wiki viewer, and corrections.
 */
import { useState } from "react";
import { useRouter } from "next/navigation";
import BulkImport from "./BulkImport";
import type { TwinRecord, SourceRecord } from "./types";

const TABS = [
  { key: "manual", label: "Paste text" },
  { key: "file", label: "Upload file" },
  { key: "blog", label: "Blog URL" },
  { key: "youtube", label: "YouTube" },
  { key: "linkedin", label: "LinkedIn / CV" },
] as const;

const TYPE_LABELS: Record<string, string> = {
  interview: "interview",
  correction: "correction",
};

export default function KnowledgeTab({
  twin,
  sources,
  wiki,
}: {
  twin: TwinRecord;
  sources: SourceRecord[];
  wiki: string | null;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("manual");
  const [title, setTitle] = useState("");
  const [payload, setPayload] = useState("");
  const [videoRef, setVideoRef] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [ytBlocked, setYtBlocked] = useState(false);
  const [correction, setCorrection] = useState("");
  const [correctionStatus, setCorrectionStatus] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);

  async function addSource() {
    setStatus("");
    setBusy(true);
    try {
      let res: Response;
      if (tab === "file") {
        if (!file) throw new Error("Choose a file first.");
        const fd = new FormData();
        fd.set("twinId", twin.id);
        fd.set("file", file);
        res = await fetch("/api/ingest", { method: "POST", body: fd });
      } else {
        res = await fetch("/api/ingest", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            twinId: twin.id,
            sourceType: tab,
            payload,
            title: title || undefined,
            videoRef: tab === "youtube" && ytBlocked ? videoRef || undefined : undefined,
          }),
        });
      }
      const j = await res.json();
      if (!res.ok) {
        if (j.code === "yt_blocked" || j.code === "yt_no_transcript") setYtBlocked(true);
        throw new Error(j.error ?? "Something went wrong.");
      }
      setStatus(`Added "${j.source.title}" — ${j.numChunks} chunks indexed. Your twin is live.`);
      setPayload("");
      setTitle("");
      setFile(null);
      router.refresh();
    } catch (e) {
      setStatus((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function addCorrection() {
    setCorrectionStatus("");
    try {
      const res = await fetch("/api/ingest", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          twinId: twin.id,
          sourceType: "correction",
          payload: correction,
        }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? "Something went wrong.");
      setCorrectionStatus("Correction absorbed — it now overrides anything it contradicts.");
      setCorrection("");
      router.refresh();
    } catch (e) {
      setCorrectionStatus((e as Error).message);
    }
  }

  async function deleteSource(id: string) {
    setDeleting(id);
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
      setStatus((e as Error).message);
    } finally {
      setDeleting(null);
    }
  }

  const isUrl = tab === "blog" || (tab === "youtube" && !ytBlocked);
  const inputCls =
    "w-full rounded-xl border border-line bg-paper px-4 py-2.5 text-sm outline-none focus:border-accent";

  return (
    <>
      <section className="rounded-3xl border border-line bg-surface p-6 shadow-[0_10px_34px_rgba(28,27,24,.07)]">
        <h2 className="font-display text-lg font-medium">Teach your twin</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => {
                setTab(t.key);
                setStatus("");
                setYtBlocked(false);
              }}
              className={`rounded-full border px-3.5 py-1.5 text-[13px] transition ${
                tab === t.key
                  ? "border-ink bg-ink text-paper"
                  : "border-line text-inksoft hover:border-accent"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab !== "file" && (
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title (optional)"
            className={`mt-4 ${inputCls}`}
          />
        )}

        {tab === "file" ? (
          <label className="mt-4 block cursor-pointer rounded-xl border border-dashed border-line bg-paper px-4 py-8 text-center text-sm text-inksoft hover:border-accent">
            {file ? file.name : "Choose a PDF, DOCX, TXT, or MD file"}
            <input
              type="file"
              accept=".pdf,.docx,.txt,.md"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </label>
        ) : isUrl ? (
          <input
            value={payload}
            onChange={(e) => setPayload(e.target.value)}
            placeholder={
              tab === "blog"
                ? "https://yourblog.com/a-post-you-wrote"
                : "https://www.youtube.com/watch?v=…"
            }
            className={`mt-3 ${inputCls}`}
          />
        ) : (
          <>
            {tab === "youtube" && ytBlocked && (
              <input
                value={videoRef}
                onChange={(e) => setVideoRef(e.target.value)}
                placeholder="Video URL (so we can link the transcript to it)"
                className={`mt-3 ${inputCls}`}
              />
            )}
            <textarea
              value={payload}
              onChange={(e) => setPayload(e.target.value)}
              rows={6}
              placeholder={
                tab === "linkedin"
                  ? "Paste your LinkedIn profile export or résumé text (LinkedIn blocks live scraping — Save to PDF, then copy the text)."
                  : tab === "youtube"
                    ? "Paste the transcript (video ··· menu → Show transcript → copy)."
                    : "Paste anything written in your voice — bios, essays, notes…"
              }
              className={`mt-3 resize-none ${inputCls}`}
            />
          </>
        )}

        {tab === "youtube" && !ytBlocked && (
          <p className="mt-2 text-xs text-inkfaint">
            Works for videos with captions. If YouTube blocks the fetch, we&apos;ll
            switch you to pasting the transcript — it works just as well.
          </p>
        )}

        {status && (
          <p className={`mt-3 text-sm ${status.startsWith("Added") ? "text-accent" : "text-accent2"}`}>
            {status}
          </p>
        )}
        <button
          onClick={addSource}
          disabled={busy || (tab === "file" ? !file : !payload)}
          className="mt-4 rounded-full bg-accent px-6 py-2.5 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-40"
        >
          {busy ? "Ingesting & re-indexing…" : "Add source"}
        </button>

        <BulkImport twinId={twin.id} />
      </section>

      <section className="mt-6 rounded-3xl border border-line bg-surface p-6">
        <h2 className="font-display text-lg font-medium">
          Sources <span className="text-sm font-normal text-inkfaint">({sources.length})</span>
        </h2>
        {sources.length === 0 ? (
          <p className="mt-3 text-sm text-inkfaint">Nothing yet — your twin is waiting to learn.</p>
        ) : (
          <ul className="mt-2 divide-y divide-line">
            {sources.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                <span className="min-w-0 flex-1 truncate font-medium">{s.title}</span>
                <span className="shrink-0 text-xs text-inkfaint">
                  {TYPE_LABELS[s.type] ?? s.type} · {s.word_count.toLocaleString()} words
                </span>
                <button
                  onClick={() => deleteSource(s.id)}
                  disabled={deleting === s.id}
                  className="shrink-0 text-xs text-inkfaint hover:text-accent2 disabled:opacity-40"
                >
                  {deleting === s.id ? "removing…" : "remove"}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-6 rounded-3xl border border-line bg-surface p-6">
        <h2 className="font-display text-lg font-medium">What your twin knows</h2>
        <p className="mt-1 text-sm text-inksoft">
          The synthesized knowledge base built from your sources. Spot something
          wrong or outdated? Add a correction — it overrides everything else.
        </p>
        {wiki ? (
          <details className="mt-3">
            <summary className="cursor-pointer text-sm font-medium text-accent">
              View knowledge base
            </summary>
            <pre className="mt-2 max-h-96 overflow-y-auto whitespace-pre-wrap rounded-xl bg-surface2 p-4 text-xs leading-relaxed">
              {wiki}
            </pre>
          </details>
        ) : (
          <p className="mt-3 text-sm text-inkfaint">
            No knowledge base yet — add a source first.
          </p>
        )}
        <textarea
          value={correction}
          onChange={(e) => setCorrection(e.target.value)}
          rows={2}
          placeholder={'e.g. "I left Acme in 2024, not 2023" or "My course is now $49"'}
          className={`mt-4 resize-none ${inputCls}`}
        />
        {correctionStatus && (
          <p className={`mt-2 text-sm ${correctionStatus.startsWith("Correction") ? "text-accent" : "text-accent2"}`}>
            {correctionStatus}
          </p>
        )}
        <button
          onClick={addCorrection}
          disabled={!correction.trim()}
          className="mt-3 rounded-full border border-accent px-5 py-2 text-sm font-semibold text-accent transition hover:bg-accentsoft disabled:opacity-40"
        >
          Add correction
        </button>
      </section>
    </>
  );
}
