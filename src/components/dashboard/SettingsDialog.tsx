"use client";
/** claude.ai-style settings popover: Profile / Behavior / Share tabs in a
 *  modal instead of a full page. Plan/billing lives in its own dialog. */
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import ProfileTab from "./ProfileTab";
import BehaviorTab from "./BehaviorTab";
import ShareTab from "./ShareTab";
import type { TwinRecord } from "./types";

const TABS = ["Profile", "Behavior", "Share & embed"] as const;

export default function SettingsDialog({
  twin,
  open,
  onOpenChange,
}: {
  twin: TwinRecord;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [tab, setTab] = useState<(typeof TABS)[number]>("Profile");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl gap-0 p-0">
        <DialogHeader className="border-b border-line px-6 pb-4 pt-6">
          <DialogTitle>Settings</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col sm:flex-row">
          <nav className="flex shrink-0 gap-1 overflow-x-auto border-b border-line p-3 sm:w-44 sm:flex-col sm:border-b-0 sm:border-r">
            {TABS.map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`whitespace-nowrap rounded-lg px-3 py-2 text-left text-sm transition ${
                  tab === t
                    ? "bg-paper font-semibold text-ink"
                    : "text-inksoft hover:bg-paper/60 hover:text-ink"
                }`}
              >
                {t}
              </button>
            ))}
          </nav>

          <div className="max-h-[62vh] min-w-0 flex-1 overflow-y-auto p-6">
            {tab === "Profile" && <ProfileTab twin={twin} />}
            {tab === "Behavior" && <BehaviorTab twin={twin} />}
            {tab === "Share & embed" && <ShareTab twin={twin} />}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
