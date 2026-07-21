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
    <main className="flex min-h-screen items-center justify-center px-6 py-10">
      <div className="arch arch-shadow w-full max-w-md overflow-hidden border border-line bg-surface">
        <div className="dome flex flex-col items-center px-8 pb-4 pt-11 text-center">
          <div className="orb mb-4 h-20 w-20" />
          <h1 className="font-display text-2xl font-medium">Claim your twin</h1>
          <p className="mt-1.5 text-sm text-inksoft">
            Pick your public URL — this is where people will meet your twin.
          </p>
        </div>
        <div className="px-8 pb-8 pt-2">
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
          className="btn-warm mt-5 w-full px-6 py-3 text-sm disabled:opacity-40"
        >
          {busy ? "Creating…" : "Create my twin →"}
        </button>
        </div>
      </div>
    </main>
  );
}
