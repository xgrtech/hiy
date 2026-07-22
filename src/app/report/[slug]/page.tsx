"use client";
/** Impersonation / abuse report form. */
import { use, useState } from "react";

export default function ReportPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const [reason, setReason] = useState("");
  const [contact, setContact] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");

  async function submit() {
    setState("busy");
    const res = await fetch("/api/report", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ slug, reason, contact: contact || undefined }),
    });
    setState(res.ok ? "done" : "error");
  }

  return (
    <main className="wash-dusk mx-auto max-w-lg px-6 py-16">
      <h1 className="font-display text-2xl font-medium">Report this twin</h1>
      <p className="mt-2 text-sm text-inksoft">
        Use this if a twin impersonates you or someone else without permission,
        or is being used abusively. We review every report.
      </p>
      {state === "done" ? (
        <p className="mt-6 rounded-2xl bg-accentsoft p-4 text-sm text-accent">
          Thank you — your report has been received.
        </p>
      ) : (
        <>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={5}
            placeholder="What's wrong? (minimum 10 characters)"
            className="mt-6 w-full rounded-xl border border-line bg-surface px-4 py-3 text-sm outline-none focus:border-accent"
          />
          <input
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            placeholder="Your email (optional, for follow-up)"
            className="mt-3 w-full rounded-xl border border-line bg-surface px-4 py-3 text-sm outline-none focus:border-accent"
          />
          {state === "error" && (
            <p className="mt-2 text-xs text-accent2">
              Couldn&apos;t submit — check the reason is at least 10 characters.
            </p>
          )}
          <button
            onClick={submit}
            disabled={state === "busy" || reason.trim().length < 10}
            className="mt-4 rounded-full bg-ink px-6 py-3 text-sm font-semibold text-paper hover:opacity-90 disabled:opacity-40"
          >
            Submit report
          </button>
        </>
      )}
    </main>
  );
}
