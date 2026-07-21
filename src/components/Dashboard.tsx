"use client";
/** Knowledge management: add sources (4 tabs + file upload), see status. */
import { useState } from "react";
import { useRouter } from "next/navigation";

interface Twin {
  id: string;
  slug: string;
  name: string;
  role_line: string | null;
  status: string;
}
interface Source {
  id: string;
  title: string;
  type: string;
  word_count: number;
}

const TABS = [
  { key: "manual", label: "Paste text" },
  { key: "file", label: "Upload file" },
  { key: "blog", label: "Blog URL" },
  { key: "youtube", label: "YouTube" },
  { key: "linkedin", label: "LinkedIn / CV" },
] as const;

export default function Dashboard({
  twin,
  sources,
}: {
  twin: Twin;
  sources: Source[];
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

  const isUrl = tab === "blog" || (tab === "youtube" && !ytBlocked);

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <header className="mb-8 flex items-center gap-5">
        <div className={`orb h-14 w-14 ${busy ? "orb--thinking" : ""}`} />
        <div className="flex-1">
          <h1 className="font-display text-2xl font-medium">{twin.name}&apos;s twin</h1>
          <p className="text-sm text-inksoft">
            hiy.ai/{twin.slug} ·{" "}
            <span className={twin.status === "live" ? "text-accent" : ""}>
              {twin.status}
            </span>
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

      <section className="rounded-3xl border border-line bg-surface p-6 shadow-[0_10px_34px_rgba(28,27,24,.07)]">
        <h2 className="font-semibold">Teach your twin</h2>
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
            className="mt-4 w-full rounded-xl border border-line bg-paper px-4 py-2.5 text-sm outline-none focus:border-accent"
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
            className="mt-3 w-full rounded-xl border border-line bg-paper px-4 py-2.5 text-sm outline-none focus:border-accent"
          />
        ) : (
          <>
            {tab === "youtube" && ytBlocked && (
              <input
                value={videoRef}
                onChange={(e) => setVideoRef(e.target.value)}
                placeholder="Video URL (so we can link the transcript to it)"
                className="mt-3 w-full rounded-xl border border-line bg-paper px-4 py-2.5 text-sm outline-none focus:border-accent"
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
              className="mt-3 w-full resize-none rounded-xl border border-line bg-paper px-4 py-2.5 text-sm outline-none focus:border-accent"
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
          <p
            className={`mt-3 text-sm ${
              status.startsWith("Added") ? "text-accent" : "text-accent2"
            }`}
          >
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
      </section>

      <section className="mt-6 rounded-3xl border border-line bg-surface p-6">
        <h2 className="font-semibold">
          Sources <span className="text-sm font-normal text-inkfaint">({sources.length})</span>
        </h2>
        {sources.length === 0 ? (
          <p className="mt-3 text-sm text-inkfaint">
            Nothing yet — your twin is waiting to learn.
          </p>
        ) : (
          <ul className="mt-2 divide-y divide-line">
            {sources.map((s) => (
              <li key={s.id} className="flex items-center justify-between py-3 text-sm">
                <span className="font-medium">{s.title}</span>
                <span className="text-xs text-inkfaint">
                  {s.type} · {s.word_count.toLocaleString()} words
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-6 rounded-3xl border border-line bg-surface2 p-6 text-sm">
        <h2 className="font-semibold">Embed on your site</h2>
        <p className="mt-1 text-inksoft">
          Paste this where you want your twin to appear (free plan includes the
          inline embed with hiy.ai branding):
        </p>
        <code className="mt-3 block overflow-x-auto rounded-xl bg-ink px-4 py-3 text-xs text-paper">
          {`<script src="${typeof window === "undefined" ? "https://hiy.ai" : window.location.origin}/embed.js" data-twin="${twin.slug}" async></script>`}
        </code>
      </section>
    </main>
  );
}
