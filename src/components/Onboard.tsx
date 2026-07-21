"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Onboard() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [name, setName] = useState("");
  const [roleLine, setRoleLine] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function create() {
    setError("");
    setBusy(true);
    try {
      const res = await fetch("/api/twin", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          username: username.toLowerCase().trim(),
          name: name.trim(),
          roleLine: roleLine.trim() || undefined,
          identityConfirmed: confirmed,
        }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? "Something went wrong.");
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-md rounded-3xl border border-line bg-surface p-8 shadow-[0_10px_34px_rgba(28,27,24,.07)]">
        <div className="orb mb-5 h-14 w-14" />
        <h1 className="font-display text-2xl font-medium">Claim your twin</h1>
        <p className="mt-1.5 text-sm text-inksoft">
          Pick your public URL — this is where people will meet your twin.
        </p>
        <div className="mt-5 flex items-center rounded-xl border border-line bg-paper px-4 py-2.5 text-sm focus-within:border-accent">
          <span className="text-inkfaint">hiy.ai/</span>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="your-name"
            className="flex-1 bg-transparent outline-none"
          />
        </div>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your full name (shown on the page)"
          className="mt-3 w-full rounded-xl border border-line bg-paper px-4 py-2.5 text-sm outline-none focus:border-accent"
        />
        <input
          value={roleLine}
          onChange={(e) => setRoleLine(e.target.value)}
          placeholder="One-line role, e.g. Founder · building in AI · Dublin"
          className="mt-3 w-full rounded-xl border border-line bg-paper px-4 py-2.5 text-sm outline-none focus:border-accent"
        />
        <label className="mt-4 flex items-start gap-2.5 text-xs text-inksoft">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
            className="mt-0.5"
          />
          I confirm this twin represents me (or someone who has given me
          documented permission), and I have the rights to the content I&apos;ll
          add.
        </label>
        {error && <p className="mt-3 text-xs text-accent2">{error}</p>}
        <button
          onClick={create}
          disabled={busy || !confirmed || !username || !name}
          className="mt-5 w-full rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-40"
        >
          {busy ? "Creating…" : "Create my twin →"}
        </button>
      </div>
    </main>
  );
}
