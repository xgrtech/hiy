"use client";
/** Publish / unpublish the twin. Adding content no longer auto-publishes, so
 *  the creator controls when hiy.ai/{slug} goes public. */
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function PublishButton({
  publish,
  className,
  children,
}: {
  publish: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function run() {
    setError("");
    setBusy(true);
    try {
      const res = await fetch("/api/twin/publish", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ publish }),
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
    <span className="inline-flex flex-col items-start gap-1">
      <button onClick={run} disabled={busy} className={className}>
        {busy ? "One moment…" : children}
      </button>
      {error && <span className="text-xs text-accent">{error}</span>}
    </span>
  );
}
