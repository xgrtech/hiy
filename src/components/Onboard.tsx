"use client";
/** Onboarding step 1 of 3 per "Hiy Mockups.dc.html" §2a: claim your hiy.
 *  (Step 2 = feed content, in the app's Training page; step 3 = go live.) */
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function Onboard() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [name, setName] = useState("");
  const [roleLine, setRoleLine] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  // If the visitor made a preview before signing up, we claim it instead of
  // building a fresh twin — the preview and its content move over.
  const [claimSlug, setClaimSlug] = useState<string | null>(null);

  useEffect(() => {
    try {
      const pending = localStorage.getItem("hiy-claim");
      // eslint-disable-next-line react-hooks/set-state-in-effect -- read pending claim on mount
      if (pending) setClaimSlug(pending);
    } catch {
      /* private mode — no pending claim */
    }
  }, []);

  const slugOk = /^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$/.test(username.toLowerCase().trim());

  async function create() {
    setError("");
    setBusy(true);
    try {
      const endpoint = claimSlug ? "/api/twin/claim" : "/api/twin";
      const body = claimSlug
        ? {
            previewSlug: claimSlug,
            username: username.toLowerCase().trim(),
            name: name.trim(),
            identityConfirmed: confirmed,
          }
        : {
            username: username.toLowerCase().trim(),
            name: name.trim(),
            roleLine: roleLine.trim() || undefined,
            identityConfirmed: confirmed,
          };
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? "Something went wrong.");
      try {
        localStorage.removeItem("hiy-claim");
      } catch {
        /* ignore */
      }
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  const inputCls =
    "w-full rounded-xl border border-line bg-paper px-4 py-2.5 text-sm outline-none focus:border-accent";

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-10">
      <div className="w-full max-w-md rounded-3xl border border-line bg-surface p-8 shadow-[0_2px_8px_rgba(10,37,64,.05),0_24px_60px_rgba(10,37,64,.08)]">
        <div className="flex items-center justify-between">
          <span className="font-display text-xl">
            hiy<span className="text-accent">.ai</span>
          </span>
          <span className="text-xs text-inkfaint">Step 1 of 3</span>
        </div>
        <div className="mt-4 flex gap-1.5">
          <span className="h-1 flex-1 rounded-full bg-accent" />
          <span className="h-1 flex-1 rounded-full bg-surface2" />
          <span className="h-1 flex-1 rounded-full bg-surface2" />
        </div>

        <h1 className="font-display mt-7 text-3xl">
          {claimSlug ? "Keep your preview" : "Claim your hiy"}
        </h1>
        <p className="mt-1.5 text-sm text-inksoft">
          {claimSlug
            ? "Pick your link — the preview you just made, and everything it learned, moves over."
            : "This is the link everyone will use to reach you."}
        </p>

        <div
          className={`mt-5 flex items-center rounded-xl border bg-paper px-4 py-2.5 text-sm focus-within:border-accent ${
            username && slugOk ? "border-green" : "border-line"
          }`}
        >
          <span className="text-inkfaint">hiy.ai/</span>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="your-name"
            className="flex-1 bg-transparent font-medium outline-none"
          />
          {username && slugOk && <span className="text-xs font-semibold text-green">✓ looks good</span>}
        </div>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your full name (shown on the page)"
          className={`mt-3 ${inputCls}`}
        />
        {!claimSlug && (
          <input
            value={roleLine}
            onChange={(e) => setRoleLine(e.target.value)}
            placeholder="One-line role, e.g. Startup coach · 40k followers"
            className={`mt-3 ${inputCls}`}
          />
        )}
        <label className="mt-4 flex items-start gap-2.5 text-xs text-inksoft">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
            className="mt-0.5"
          />
          I confirm this hiy represents me (or someone who has given me
          documented permission), and I have the rights to the content I&apos;ll
          add.
        </label>
        {error && <p className="mt-3 text-xs text-accent">{error}</p>}
        <button
          onClick={create}
          disabled={busy || !confirmed || !username || !name}
          className="btn-warm mt-5 w-full px-6 py-3 text-sm disabled:opacity-40"
        >
          {busy ? (claimSlug ? "Claiming…" : "Creating…") : claimSlug ? "Keep my hiy" : "Continue"}
        </button>
        <p className="mt-3 text-center text-xs text-inkfaint">
          {claimSlug ? "Your preview becomes permanent — add more anytime." : "Next: feed it your content, then go live."}
        </p>
      </div>
    </main>
  );
}
