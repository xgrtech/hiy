"use client";
/** Profile & account settings as a claude.ai-style popover. Behavior and
 *  Share & embed are their own sidebar views, not tabs here. */
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import ProfileTab from "./ProfileTab";
import type { TwinRecord } from "./types";

export default function SettingsDialog({
  twin,
  open,
  onOpenChange,
}: {
  twin: TwinRecord;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg gap-0 p-0">
        <DialogHeader className="border-b border-line px-6 pb-4 pt-6">
          <DialogTitle>Profile &amp; settings</DialogTitle>
        </DialogHeader>
        <div className="max-h-[68vh] overflow-y-auto p-6">
          <ProfileTab twin={twin} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
