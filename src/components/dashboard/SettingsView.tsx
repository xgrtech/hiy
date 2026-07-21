"use client";
/** Settings per "Hiy Mockups" §3d: Profile / Behavior / Share / Plan tabs.
 *  Plan is honest — free while launching, no fake invoices. */
import { useState } from "react";
import Link from "next/link";
import ProfileTab from "./ProfileTab";
import BehaviorTab from "./BehaviorTab";
import ShareTab from "./ShareTab";
import type { TwinRecord } from "./types";

const TABS = ["Profile", "Behavior", "Share & embed", "Plan"] as const;

export default function SettingsView({ twin }: { twin: TwinRecord }) {
  const [tab, setTab] = useState<(typeof TABS)[number]>("Profile");

  return (
    <>
      <header className="mb-6">
        <h1 className="font-display text-3xl">Settings</h1>
      </header>

      <nav className="mb-6 flex flex-wrap gap-1 border-b border-line">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`-mb-px rounded-t-lg px-4 py-2.5 text-sm transition ${
              tab === t
                ? "border-b-2 border-accent font-semibold text-ink"
                : "text-inksoft hover:text-ink"
            }`}
          >
            {t}
          </button>
        ))}
      </nav>

      {tab === "Profile" && <ProfileTab twin={twin} />}
      {tab === "Behavior" && <BehaviorTab twin={twin} />}
      {tab === "Share & embed" && <ShareTab twin={twin} />}
      {tab === "Plan" && (
        <div className="space-y-4">
          <div className="rounded-2xl bg-dark p-6 text-white">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs text-white/60">Current plan</p>
                <p className="font-display mt-1 text-2xl">Starter — free</p>
              </div>
              <Link href="/pricing" className="btn-warm px-5 py-2.5 text-xs">
                See upcoming plans
              </Link>
            </div>
            <p className="mt-4 text-xs leading-relaxed text-white/60">
              Everything currently shipped is free while we launch. Paid tiers
              (embeds everywhere, bigger training limits, custom branding) arrive
              with billing — citations and honest answers stay free forever.
            </p>
          </div>
          <div className="rounded-2xl border border-line bg-surface p-5">
            <p className="text-sm font-semibold">Danger zone</p>
            <p className="mt-1 text-xs text-inksoft">
              Export or delete everything, any time — your content is yours. Write
              to{" "}
              <a href="mailto:hello@hiy.ai" className="text-accent underline">
                hello@hiy.ai
              </a>{" "}
              while self-serve export ships.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
