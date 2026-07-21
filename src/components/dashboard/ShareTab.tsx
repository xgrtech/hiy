"use client";
/** Share tab: public link, ?q= deep links, embed snippet. */
import { useState } from "react";
import type { TwinRecord } from "./types";

export default function ShareTab({ twin }: { twin: TwinRecord }) {
  const [copied, setCopied] = useState("");
  const origin = typeof window === "undefined" ? "https://hiy.ai" : window.location.origin;
  const publicUrl = `${origin}/${twin.slug}`;
  const firstQuestion = twin.suggested_questions?.[0];

  function copy(text: string, which: string) {
    navigator.clipboard?.writeText(text).then(() => {
      setCopied(which);
      setTimeout(() => setCopied(""), 1500);
    });
  }

  return (
    <section className="rounded-3xl border border-line bg-surface p-6">
      <h2 className="font-semibold">Share your twin</h2>

      <h3 className="mt-5 text-sm font-semibold">Public link</h3>
      <div className="mt-2 flex items-center gap-2">
        <code className="flex-1 overflow-x-auto rounded-xl bg-surface2 px-4 py-2.5 text-sm">
          {publicUrl}
        </code>
        <button
          onClick={() => copy(publicUrl, "link")}
          className="shrink-0 rounded-full border border-line px-4 py-2 text-sm hover:border-accent"
        >
          {copied === "link" ? "Copied ✓" : "Copy"}
        </button>
      </div>

      {firstQuestion && (
        <>
          <h3 className="mt-6 text-sm font-semibold">Deep link to a great first answer</h3>
          <p className="mt-0.5 text-xs text-inkfaint">
            Links with ?q= auto-ask the question — perfect for social posts.
          </p>
          <div className="mt-2 flex items-center gap-2">
            <code className="flex-1 overflow-x-auto whitespace-nowrap rounded-xl bg-surface2 px-4 py-2.5 text-sm">
              {publicUrl}?q={encodeURIComponent(firstQuestion)}
            </code>
            <button
              onClick={() => copy(`${publicUrl}?q=${encodeURIComponent(firstQuestion)}`, "deep")}
              className="shrink-0 rounded-full border border-line px-4 py-2 text-sm hover:border-accent"
            >
              {copied === "deep" ? "Copied ✓" : "Copy"}
            </button>
          </div>
        </>
      )}

      <h3 className="mt-6 text-sm font-semibold">Embed on your site</h3>
      <p className="mt-0.5 text-xs text-inkfaint">
        Free plan includes the inline embed with hiy.ai branding.
      </p>
      <code className="mt-2 block overflow-x-auto rounded-xl bg-ink px-4 py-3 text-xs text-paper">
        {`<script src="${origin}/embed.js" data-twin="${twin.slug}" async></script>`}
      </code>
    </section>
  );
}
