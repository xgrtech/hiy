"use client";
/** The try-before-signup wow: paste content → chat with a preview twin. */
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
    <div className="rounded-3xl border border-line bg-surface p-6 shadow-[0_1px_2px_rgba(28,27,24,.04),0_10px_34px_rgba(28,27,24,.07)]">
      <div className="mb-4 flex items-center gap-3">
        <div className={`orb h-10 w-10 ${busy ? "orb--thinking" : ""}`} />
        <div>
          <div className="text-[15px] font-semibold">Try it in 30 seconds</div>
          <div className="text-xs text-inkfaint">No account. Preview twin lasts 24 hours.</div>
        </div>
      </div>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Your first name"
        className="mb-3 w-full rounded-xl border border-line bg-paper px-4 py-2.5 text-sm outline-none focus:border-accent"
      />
      <div className="mb-2 flex gap-2 text-xs">
        {(["manual", "blog"] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`rounded-full border px-3 py-1.5 transition ${
              mode === m
                ? "border-ink bg-ink text-paper"
                : "border-line bg-surface text-inksoft hover:border-accent"
            }`}
          >
            {m === "manual" ? "Paste text about you" : "Blog / article URL"}
          </button>
        ))}
      </div>
      {mode === "manual" ? (
        <textarea
          value={payload}
          onChange={(e) => setPayload(e.target.value)}
          rows={4}
          placeholder="Paste a bio, an essay you wrote, notes — anything in your voice…"
          className="w-full resize-none rounded-xl border border-line bg-paper px-4 py-2.5 text-sm outline-none focus:border-accent"
        />
      ) : (
        <input
          value={payload}
          onChange={(e) => setPayload(e.target.value)}
          placeholder="https://yourblog.com/a-post-you-wrote"
          className="w-full rounded-xl border border-line bg-paper px-4 py-2.5 text-sm outline-none focus:border-accent"
        />
      )}
      {error && <p className="mt-2 text-xs text-accent2">{error}</p>}
      <button
        onClick={build}
        disabled={busy}
        className="mt-4 w-full rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-50"
      >
        {busy ? "Building your preview twin…" : "Meet your twin →"}
      </button>
    </div>
  );
}
