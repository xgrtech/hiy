"use client";
/**
 * Plays in-card entrances (.ov-bar/.ov-chip children) when scrolled into
 * view. Progressive: content is fully visible without JS or with reduced
 * motion — ov-prep (hide) is only applied after hydration, ov-in animates
 * back in on intersection.
 */
import { useEffect, useRef, useState, type ReactNode } from "react";

export default function OnView({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<"idle" | "prep" | "in">("idle");

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      typeof IntersectionObserver === "undefined"
    ) {
      return; // stay in "idle": everything visible, nothing animates
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setPhase("in");
          io.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    // eslint-disable-next-line react-hooks/set-state-in-effect -- arm the entrance after mount (progressive, JS-gated)
    setPhase("prep");
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const ov = phase === "prep" ? "ov-prep" : phase === "in" ? "ov-prep ov-in" : "";
  return (
    <div ref={ref} className={[className, ov].filter(Boolean).join(" ")}>
      {children}
    </div>
  );
}
