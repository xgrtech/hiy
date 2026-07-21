"use client";
/**
 * Bulk import: discover a site's posts or a channel's videos, pick items,
 * import sequentially (skipReindex per item, concurrency 2), then one
 * final reindex. Per-row typed errors with retry.
 */
import { useState } from "react";
import { useRouter } from "next/navigation";

interface Item {
  key: string;
  label: string;
  sub: string | null;
  /** blog URL or youtube video URL passed to /api/ingest */
  payload: string;
  sourceType: "blog" | "youtube";
}

type RowState = { status: "pending" | "importing" | "done" | "error"; error?: string };

export default function BulkImport({ twinId }: { twinId: string }) {
  const router = useRouter();
  const [kind, setKind] = useState<"site" | "channel">("site");
  const [url, setUrl] = useState("");
  const [items, setItems] = useState<Item[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [rows, setRows] = useState<Record<string, RowState>>({});
  const [budget, setBudget] = useState<{ remainingSources: number } | null>(null);
  const [phase, setPhase] = useState<"idle" | "discovering" | "picking" | "importing" | "done">("idle");
  const [error, setError] = useState("");

  async function discover() {
    setError("");
    setPhase("discovering");
    try {
      const res = await fetch("/api/discover", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ twinId, kind, url }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? "Discovery failed.");
      const mapped: Item[] =
        kind === "site"
          ? (j.items as { url: string; title: string | null; lastmod: string | null }[]).map((p) => ({
              key: p.url,
              label: p.title ?? p.url.replace(/^https?:\/\//, ""),
              sub: p.lastmod,
              payload: p.url,
              sourceType: "blog" as const,
            }))
          : (j.items as { videoId: string; title: string; duration: string | null; published: string | null }[]).map((v) => ({
              key: v.videoId,
              label: v.title,
              sub: [v.duration, v.published].filter(Boolean).join(" · ") || null,
              payload: `https://www.youtube.com/watch?v=${v.videoId}`,
              sourceType: "youtube" as const,
            }));
      setItems(mapped);
      setBudget(j.budget);
      // Preselect within the remaining source budget.
      setSelected(new Set(mapped.slice(0, Math.max(0, j.budget.remainingSources)).map((i) => i.key)));
      setPhase("picking");
    } catch (e) {
      setError((e as Error).message);
      setPhase("idle");
    }
  }

  async function importOne(item: Item): Promise<boolean> {
    setRows((r) => ({ ...r, [item.key]: { status: "importing" } }));
    try {
      const res = await fetch("/api/ingest", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          twinId,
          sourceType: item.sourceType,
          payload: item.payload,
          skipReindex: true,
        }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? "Import failed.");
      setRows((r) => ({ ...r, [item.key]: { status: "done" } }));
      return true;
    } catch (e) {
      setRows((r) => ({ ...r, [item.key]: { status: "error", error: (e as Error).message } }));
      return false;
    }
  }

  async function runImport() {
    setPhase("importing");
    const queue = items.filter((i) => selected.has(i.key));
    // Concurrency 2, polite and serverless-friendly.
    let idx = 0;
    async function worker() {
      while (idx < queue.length) {
        const item = queue[idx++];
        await importOne(item);
      }
    }
    await Promise.all([worker(), worker()]);
    try {
      await fetch("/api/twin/reindex", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ twinId }),
      });
    } catch {}
    setPhase("done");
    router.refresh();
  }

  const inputCls =
    "w-full rounded-xl border border-line bg-paper px-4 py-2.5 text-sm outline-none focus:border-accent";
  const doneCount = Object.values(rows).filter((r) => r.status === "done").length;

  return (
    <div className="mt-4 rounded-2xl border border-dashed border-line bg-paper p-4">
      <h3 className="text-sm font-semibold">Bulk import</h3>
      <p className="mt-0.5 text-xs text-inkfaint">
        Import a whole blog (via its sitemap or feed) or a YouTube channel at once.
      </p>

      {(phase === "idle" || phase === "discovering") && (
        <div className="mt-3">
          <div className="flex gap-2">
            {(["site", "channel"] as const).map((k) => (
              <button
                key={k}
                onClick={() => setKind(k)}
                className={`rounded-full border px-3.5 py-1.5 text-[13px] transition ${
                  kind === k ? "border-ink bg-ink text-paper" : "border-line text-inksoft hover:border-accent"
                }`}
              >
                {k === "site" ? "Blog / site" : "YouTube channel"}
              </button>
            ))}
          </div>
          <div className="mt-2 flex gap-2">
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder={kind === "site" ? "https://yourblog.com" : "youtube.com/@yourhandle"}
              className={inputCls}
            />
            <button
              onClick={discover}
              disabled={!url.trim() || phase === "discovering"}
              className="shrink-0 rounded-full bg-accent px-5 py-2 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-40"
            >
              {phase === "discovering" ? "Looking…" : "Find content"}
            </button>
          </div>
          {error && <p className="mt-2 text-sm text-accent2">{error}</p>}
        </div>
      )}

      {(phase === "picking" || phase === "importing" || phase === "done") && (
        <div className="mt-3">
          <div className="flex items-center justify-between text-xs text-inksoft">
            <span>
              {items.length} found · {selected.size} selected
              {budget && ` · ${budget.remainingSources} source slots left on your plan`}
            </span>
            {phase === "picking" && (
              <span>
                <button onClick={() => setSelected(new Set(items.map((i) => i.key)))} className="underline">
                  all
                </button>{" "}
                ·{" "}
                <button onClick={() => setSelected(new Set())} className="underline">
                  none
                </button>
              </span>
            )}
          </div>
          <ul className="mt-2 max-h-64 divide-y divide-line overflow-y-auto rounded-xl border border-line bg-surface">
            {items.map((item) => {
              const row = rows[item.key];
              return (
                <li key={item.key} className="flex items-center gap-3 px-3 py-2 text-sm">
                  <input
                    type="checkbox"
                    checked={selected.has(item.key)}
                    disabled={phase !== "picking"}
                    onChange={(e) => {
                      const next = new Set(selected);
                      if (e.target.checked) next.add(item.key);
                      else next.delete(item.key);
                      setSelected(next);
                    }}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">{item.label}</span>
                    {item.sub && <span className="block text-xs text-inkfaint">{item.sub}</span>}
                    {row?.status === "error" && (
                      <span className="block text-xs text-accent2">
                        {row.error}{" "}
                        <button onClick={() => importOne(item)} className="underline">
                          retry
                        </button>
                      </span>
                    )}
                  </span>
                  <span className="shrink-0 text-xs">
                    {row?.status === "importing" && <span className="text-inkfaint">importing…</span>}
                    {row?.status === "done" && <span className="text-accent">✓</span>}
                    {row?.status === "error" && <span className="text-accent2">✗</span>}
                  </span>
                </li>
              );
            })}
          </ul>
          {phase === "picking" && (
            <button
              onClick={runImport}
              disabled={selected.size === 0}
              className="mt-3 rounded-full bg-accent px-6 py-2.5 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-40"
            >
              Import {selected.size} item{selected.size === 1 ? "" : "s"}
            </button>
          )}
          {phase === "importing" && (
            <p className="mt-3 text-sm text-inksoft">
              Importing… {doneCount}/{selected.size} (re-indexing happens once at the end)
            </p>
          )}
          {phase === "done" && (
            <p className="mt-3 text-sm text-accent">
              Imported {doneCount}/{selected.size} — your twin has been re-indexed.{" "}
              <button
                onClick={() => {
                  setPhase("idle");
                  setItems([]);
                  setRows({});
                  setUrl("");
                }}
                className="underline"
              >
                Import more
              </button>
            </p>
          )}
        </div>
      )}
    </div>
  );
}
