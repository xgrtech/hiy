"use client";
/**
 * The landing hero object: an arch card where your twin is born.
 * Paste content → meet a preview twin in ~30s. No account.
 */
import { useState } from "react";
import { useRouter } from "next/navigation";
import Thinking from "./Thinking";

export default function InstantTwin() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [payload, setPayload] = useState("");
  const [mode, setMode] = useState<"manual" | "blog">("manual");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function build() {
    setError("");
    if (!name.trim() || !payload.trim()) {
      setError("Add your name and some content first.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/instant", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: name.trim(), sourceType: mode, payload: payload.trim() }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Something went wrong.");
      router.push(`/${json.slug}?preview=1`);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <div className="relative mx-auto w-full max-w-[420px] overflow-hidden rounded-3xl border border-line bg-surface shadow-[0_2px_8px_rgba(33,29,24,.05),0_24px_60px_rgba(33,29,24,.1)]">
      <div className="dome flex flex-col items-center px-8 pb-4 pt-8">
        <span className="flex h-16 w-16 items-center justify-center">
          <Thinking
            state={busy ? "working" : "listening"}
            size={64}
            label={busy ? "building your hiy" : "your hiy is listening"}
          />
        </span>
        <p className="font-display mt-3 text-2xl">
          {name.trim() ? `${name.trim()}'s hiy` : "Your hiy"}
        </p>
        <p className="mt-0.5 text-xs text-inkfaint">≈30 seconds · no account · lasts 24h</p>
      </div>

      <div className="px-6 pb-6">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your first name"
          className="mb-2.5 w-full rounded-xl border border-line bg-paper px-4 py-2.5 text-sm outline-none focus:border-accent2"
        />
        <div className="mb-2 flex gap-1.5 text-xs">
          {(["manual", "blog"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`rounded-full border px-3 py-1.5 transition ${
                mode === m
                  ? "border-ink bg-ink text-paper"
                  : "border-line bg-surface text-inksoft hover:border-accent2"
              }`}
            >
              {m === "manual" ? "Paste your writing" : "Blog / article URL"}
            </button>
          ))}
        </div>
        {mode === "manual" ? (
          <textarea
            value={payload}
            onChange={(e) => setPayload(e.target.value)}
            rows={3}
            placeholder="A bio, an essay, notes — anything in your voice…"
            className="w-full resize-none rounded-xl border border-line bg-paper px-4 py-2.5 text-sm outline-none focus:border-accent2"
          />
        ) : (
          <input
            value={payload}
            onChange={(e) => setPayload(e.target.value)}
            placeholder="https://yourblog.com/a-post-you-wrote"
            className="w-full rounded-xl border border-line bg-paper px-4 py-2.5 text-sm outline-none focus:border-accent2"
          />
        )}
        {error && <p className="mt-2 text-xs text-accent2">{error}</p>}
        <button
          onClick={build}
          disabled={busy}
          className="btn-warm mt-3.5 w-full px-6 py-3 text-sm disabled:opacity-50"
        >
          {busy ? "Building your preview hiy…" : "Meet your hiy →"}
        </button>
      </div>
    </div>
  );
}
