"use client";
/**
 * The landing hero object: an arch card where your twin is born.
 * Paste content → meet a preview twin in ~30s. No account.
 */
import { useState } from "react";
import { useRouter } from "next/navigation";

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
    <div className="arch arch-shadow relative mx-auto w-full max-w-[380px] overflow-hidden border border-line bg-surface">
      {/* dome: the twin taking shape */}
      <div className="dome flex flex-col items-center px-8 pb-4 pt-12">
        <div className={`orb h-28 w-28 ${busy ? "orb--thinking" : ""}`} />
        <p className="font-display mt-4 text-xl font-medium">
          {name.trim() ? `${name.trim()}'s twin` : "Your twin"}
        </p>
        <p className="mt-0.5 text-xs text-inkfaint">≈30 seconds · no account</p>
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
          {busy ? "Building your preview twin…" : "Meet your twin →"}
        </button>
      </div>
    </div>
  );
}
