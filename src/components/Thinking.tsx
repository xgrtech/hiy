"use client";
/**
 * hiy's activity indicator: Jakub Antalik's thinking-orbs, wrapped so
 * prefers-reduced-motion freezes the animation (the canvas still renders
 * a static frame — presence without motion).
 */
import { useEffect, useState } from "react";
import { ThinkingOrb, type OrbState, type OrbSize } from "thinking-orbs";

export default function Thinking({
  state = "working",
  size = 20,
  label,
}: {
  state?: OrbState;
  size?: OrbSize;
  label?: string;
}) {
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync to reduced-motion on mount
    setPaused(mq.matches);
    const onChange = () => setPaused(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return (
    <ThinkingOrb
      state={state}
      size={size}
      theme="light"
      paused={paused}
      aria-label={label ?? `${state}…`}
    />
  );
}
