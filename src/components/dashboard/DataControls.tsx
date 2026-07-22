"use client";
/** Your-data controls: export everything, delete the twin, or delete the
 *  whole account. Destructive actions require an explicit confirm. */
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Download, Trash2 } from "lucide-react";

type Confirming = null | "twin" | "account";

export default function DataControls() {
  const router = useRouter();
  const [confirming, setConfirming] = useState<Confirming>(null);
  const [ack, setAck] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function del(kind: "twin" | "account") {
    setError("");
    setBusy(true);
    try {
      const res = await fetch(kind === "twin" ? "/api/twin" : "/api/account", {
        method: "DELETE",
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? "Something went wrong.");
      }
      if (kind === "account") {
        window.location.href = "/";
      } else {
        router.refresh(); // back to onboarding
      }
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <section className="mt-8 border-t border-line pt-6">
      <h3 className="text-sm font-semibold">Your data</h3>
      <p className="mt-1 text-xs text-inksoft">
        Your content is yours — take it or remove it whenever you like.
      </p>

      {/* File download from an API route (not page navigation), so a plain
          anchor is correct here — Link would try to client-navigate. */}
      {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
      <a
        href="/api/account/export"
        className="mt-4 inline-flex items-center gap-2 rounded-full border border-line px-4 py-2 text-sm font-medium text-inksoft transition hover:border-ink hover:text-ink"
      >
        <Download className="h-4 w-4" /> Export my data (JSON)
      </a>

      <div className="mt-5 rounded-xl border border-accent/30 bg-accentsoft/40 p-4">
        <p className="text-sm font-semibold text-accentdeep">Danger zone</p>

        {confirming === null && (
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              onClick={() => {
                setConfirming("twin");
                setAck("");
                setError("");
              }}
              className="inline-flex items-center gap-1.5 rounded-full border border-accent/40 px-3.5 py-1.5 text-xs font-medium text-accent transition hover:bg-accentsoft"
            >
              <Trash2 className="h-3.5 w-3.5" /> Delete my twin
            </button>
            <button
              onClick={() => {
                setConfirming("account");
                setAck("");
                setError("");
              }}
              className="inline-flex items-center gap-1.5 rounded-full border border-accent/40 px-3.5 py-1.5 text-xs font-medium text-accent transition hover:bg-accentsoft"
            >
              <Trash2 className="h-3.5 w-3.5" /> Delete my account
            </button>
          </div>
        )}

        {confirming === "twin" && (
          <div className="mt-3">
            <p className="text-xs text-inksoft">
              This permanently deletes your twin, its content, its index, and
              every conversation it&apos;s had. Your account stays.
            </p>
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => del("twin")}
                disabled={busy}
                className="rounded-full bg-accent px-4 py-1.5 text-xs font-semibold text-white transition hover:brightness-110 disabled:opacity-50"
              >
                {busy ? "Deleting…" : "Yes, delete my twin"}
              </button>
              <button
                onClick={() => setConfirming(null)}
                className="rounded-full px-3 py-1.5 text-xs font-medium text-inksoft hover:text-ink"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {confirming === "account" && (
          <div className="mt-3">
            <p className="text-xs text-inksoft">
              This permanently deletes your <b>account and everything in it</b>.
              This can&apos;t be undone. Type <b>delete</b> to confirm.
            </p>
            <input
              value={ack}
              onChange={(e) => setAck(e.target.value)}
              placeholder="delete"
              className="mt-2 w-40 rounded-lg border border-line bg-paper px-3 py-1.5 text-sm outline-none focus:border-accent"
            />
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => del("account")}
                disabled={busy || ack.trim().toLowerCase() !== "delete"}
                className="rounded-full bg-accent px-4 py-1.5 text-xs font-semibold text-white transition hover:brightness-110 disabled:opacity-40"
              >
                {busy ? "Deleting…" : "Delete my account"}
              </button>
              <button
                onClick={() => setConfirming(null)}
                className="rounded-full px-3 py-1.5 text-xs font-medium text-inksoft hover:text-ink"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {error && <p className="mt-2 text-xs text-accent">{error}</p>}
      </div>
    </section>
  );
}
