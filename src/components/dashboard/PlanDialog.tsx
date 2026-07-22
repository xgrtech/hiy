"use client";
/** Plan & billing popover — honest: free while launching, no fake invoices. */
import Link from "next/link";
import { Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

const INCLUDED = [
  "Cited answers on your public hiy",
  "The honest “I don’t know” — never paywalled",
  "10,000 training words · 5 sources",
  "Personality interview & corrections",
];

export default function PlanDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Plan &amp; billing</DialogTitle>
          <DialogDescription>
            Everything shipped today is free while we launch — no card, no expiry.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-xl border border-line bg-paper p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-inkfaint">Current plan</p>
              <p className="font-display text-xl">Starter</p>
            </div>
            <span className="rounded-full bg-greensoft px-3 py-1 text-xs font-semibold text-green">
              Free
            </span>
          </div>
          <ul className="mt-4 space-y-2">
            {INCLUDED.map((f) => (
              <li key={f} className="flex items-start gap-2 text-sm text-inksoft">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-green" />
                {f}
              </li>
            ))}
          </ul>
        </div>

        <p className="text-xs leading-relaxed text-inkfaint">
          Paid tiers — embeds everywhere, bigger training limits, custom
          branding — arrive with billing. Citations and honest answers stay free
          forever.
        </p>

        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Link
            href="/pricing"
            className="rounded-full border border-line px-5 py-2.5 text-center text-sm font-medium text-inksoft transition hover:border-ink hover:text-ink"
          >
            Compare upcoming plans
          </Link>
        </div>
      </DialogContent>
    </Dialog>
  );
}
