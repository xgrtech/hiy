"use client";
/**
 * Landing example card as a real product mock: a miniature of the actual
 * twin chat playing itself — question → thinking → answer with a citation
 * chip or the honest dashed "don't know" treatment. Loops through its
 * exchanges while visible; reduced-motion and no-JS get the first
 * exchange settled, static.
 */
import { useEffect, useRef, useState } from "react";

export interface MockExchange {
  q: string;
  a: string;
  /** Source-chip label → cited answer; omit for the honest-IDK treatment. */
  cite?: string;
}

interface ExampleTwinCardProps {
  initials: string;
  name: string;
  role: string;
  /** Tailwind bg class for the avatar disc. */
  avatarClass: string;
  exchanges: MockExchange[];
}

type Phase = "question" | "thinking" | "answer";

const THINK_AFTER_MS = 700;
const ANSWER_AFTER_MS = 2000;
const HOLD_MS = 5200;

export default function ExampleTwinCard({
  initials,
  name,
  role,
  avatarClass,
  exchanges,
}: ExampleTwinCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("answer"); // settled without JS/motion
  const [animated, setAnimated] = useState(false);
  const [visible, setVisible] = useState(false);

  // Decide once whether to animate; then observe visibility to pause offscreen.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      typeof IntersectionObserver === "undefined" ||
      exchanges.length === 0
    ) {
      return;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- enable motion after mount (reduced-motion/JS gate)
    setAnimated(true);
    const io = new IntersectionObserver(
      (entries) => setVisible(entries.some((e) => e.isIntersecting)),
      { threshold: 0.4 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [exchanges.length]);

  // Phase machine: question → thinking → answer → (hold) → next question.
  useEffect(() => {
    if (!animated || !visible) return;
    if (phase === "question") {
      const t = setTimeout(() => setPhase("thinking"), THINK_AFTER_MS);
      return () => clearTimeout(t);
    }
    if (phase === "thinking") {
      const t = setTimeout(() => setPhase("answer"), ANSWER_AFTER_MS);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => {
      setIndex((i) => (i + 1) % exchanges.length);
      setPhase("question");
    }, HOLD_MS);
    return () => clearTimeout(t);
  }, [animated, visible, phase, exchanges.length]);

  const ex = exchanges[index] ?? exchanges[0];
  if (!ex) return null;

  return (
    <div
      ref={ref}
      className="lift hidden overflow-hidden rounded-2xl border border-line bg-surface shadow-[0_2px_8px_rgba(33,29,24,.05)] lg:block"
    >
      <div className="flex items-center gap-3 border-b border-line px-5 py-3.5">
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-display text-sm text-white ${avatarClass}`}
        >
          {initials}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{name}</p>
          <p className="truncate text-[11px] text-inkfaint">{role}</p>
        </div>
        <span className="flex shrink-0 items-center gap-1 rounded-full bg-greensoft px-2 py-1 text-[10px] font-semibold text-green">
          <span className="h-1.5 w-1.5 rounded-full bg-green" aria-hidden />
          AI twin
        </span>
      </div>

      <div className="flex min-h-44 flex-col justify-end gap-2.5 px-4 py-4" aria-live="off">
        <div key={`q-${index}`} className="bubble-in flex justify-end">
          <p className="max-w-[85%] rounded-2xl rounded-br-md bg-dark px-3.5 py-2 text-xs leading-relaxed text-white">
            {ex.q}
          </p>
        </div>

        {phase === "thinking" && (
          <div className="bubble-in flex">
            <span className="flex items-center gap-1 rounded-2xl rounded-bl-md bg-paper px-3.5 py-2.5">
              {[0, 1, 2].map((i) => (
                <span key={i} className="think-dot h-1.5 w-1.5 rounded-full bg-inkfaint" />
              ))}
            </span>
          </div>
        )}

        {phase === "answer" && (
          <div key={`a-${index}`} className="bubble-in flex">
            <div
              className={`max-w-[88%] rounded-2xl rounded-bl-md px-3.5 py-2 text-xs leading-relaxed ${
                ex.cite ? "bg-paper" : "border-[1.5px] border-dashed border-line text-inksoft"
              }`}
            >
              {ex.a}
              <span className="mt-1.5 block">
                {ex.cite ? (
                  <span className="chip-cite">⌘ From: {ex.cite}</span>
                ) : (
                  <span className="chip-idk">honest by default</span>
                )}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
