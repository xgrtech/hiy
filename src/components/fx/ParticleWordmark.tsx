"use client";

import { useEffect, useRef } from "react";

/**
 * A drifting field of motes that assembles into the "hiy." wordmark —
 * ported from the telemeter project's signature effect and retuned for
 * hiy's light paper canvas. The story is the product: scattered fragments
 * of your content assemble into you; scatter them with the cursor and the
 * word knits itself back together.
 *
 * The word is rasterised once to an offscreen canvas (in Instrument Serif),
 * its alpha mask sampled on a grid; every lit pixel becomes a target.
 * Particles spawn scattered and ease toward their targets, then breathe.
 * A second population never gets a target and just drifts.
 */

const SAMPLE_STEP = 4;
const AMBIENT_COUNT = 80;
const MAX_GLYPH_PARTICLES = 2400;
const MAX_DPR = 2;
const REPEL_RADIUS = 120;
const REPEL_FORCE = 24;

type Particle = {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  /** Per-particle ease, so the word knits together unevenly. */
  pull: number;
  drift: number;
  phase: number;
  size: number;
  alpha: number;
  accent: boolean;
};

function noise(index: number, salt: number): number {
  const value = Math.sin(index * 12.9898 + salt * 78.233) * 43758.5453;
  return value - Math.floor(value);
}

function resolveToken(host: HTMLElement, token: string, fallback: string): string {
  const probe = document.createElement("span");
  probe.style.cssText = `color: var(${token}); display: none;`;
  host.appendChild(probe);
  const resolved = getComputedStyle(probe).color;
  probe.remove();
  return resolved || fallback;
}

/** Rasterise `word` centred in the canvas; one target per lit mask pixel. */
function sampleWord(word: string, width: number, height: number): { x: number; y: number }[] {
  const mask = document.createElement("canvas");
  mask.width = width;
  mask.height = height;
  const ctx = mask.getContext("2d", { willReadFrequently: true });
  if (!ctx) return [];

  let fontSize = Math.min(height * 0.72, width * 0.3);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const font = (size: number) => `700 ${size}px "Inter", system-ui, sans-serif`;
  ctx.font = font(fontSize);
  const maxWidth = width * 0.9;
  const measured = ctx.measureText(word).width;
  if (measured > maxWidth) {
    fontSize *= maxWidth / measured;
    ctx.font = font(fontSize);
  }

  ctx.fillStyle = "#fff";
  ctx.fillText(word, width / 2, height / 2);

  const { data } = ctx.getImageData(0, 0, width, height);
  const points: { x: number; y: number }[] = [];
  for (let y = 0; y < height; y += SAMPLE_STEP) {
    for (let x = 0; x < width; x += SAMPLE_STEP) {
      if (data[(y * width + x) * 4 + 3]! > 128) points.push({ x, y });
    }
  }

  if (points.length <= MAX_GLYPH_PARTICLES) return points;
  const stride = points.length / MAX_GLYPH_PARTICLES;
  return Array.from(
    { length: MAX_GLYPH_PARTICLES },
    (_, i) => points[Math.floor(i * stride)]!
  );
}

function seedParticles(word: string, width: number, height: number): Particle[] {
  const targets = sampleWord(word, width, height);

  const glyph = targets.map((target, index) => ({
    x: noise(index, 1) * width,
    y: noise(index, 2) * height,
    targetX: target.x,
    targetY: target.y,
    pull: 0.012 + noise(index, 3) * 0.032,
    drift: 0.6 + noise(index, 4) * 1.4,
    phase: noise(index, 5) * Math.PI * 2,
    size: 1.1 + noise(index, 6) * 1.2,
    // Light background: ink/terracotta carry the word — solid, not dirt.
    alpha: 0.55 + noise(index, 7) * 0.35,
    accent: noise(index, 8) > 0.4,
  }));

  const ambient = Array.from({ length: AMBIENT_COUNT }, (_, i) => {
    const index = i + targets.length;
    const depth = noise(index, 9);
    return {
      x: noise(index, 10) * width,
      y: noise(index, 11) * height,
      targetX: 0,
      targetY: 0,
      pull: 0,
      drift: 2 + depth * 6,
      phase: noise(index, 12) * Math.PI * 2,
      size: 0.5 + depth * depth * 1.5,
      alpha: 0.07 + depth * 0.22,
      accent: noise(index, 13) > 0.7,
    };
  });

  return [...glyph, ...ambient];
}

export default function ParticleWordmark({
  className,
  word = "hiy.",
}: {
  className?: string;
  word?: string;
}) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const accent = resolveToken(canvas, "--accent", "rgb(194, 84, 47)");
    const neutral = resolveToken(canvas, "--ink-soft", "rgb(107, 100, 91)");

    let width = 0;
    let height = 0;
    let particles: Particle[] = [];
    let frame = 0;
    let running = false;
    let disposed = false;
    let initialized = false;
    let last = 0;
    const pointer = { x: 0, y: 0, active: false };

    const paint = (particle: Particle, alpha: number) => {
      context.globalAlpha = alpha;
      context.fillStyle = particle.accent ? accent : neutral;
      // fillRect not arc(): indistinguishable at 1-2px, ~2400 calls a frame.
      context.fillRect(particle.x, particle.y, particle.size, particle.size);
    };

    /** The settled word, no animation — what reduced-motion users get. */
    const paintStatic = () => {
      context.clearRect(0, 0, width, height);
      for (const particle of particles) {
        if (particle.pull === 0) continue;
        paint({ ...particle, x: particle.targetX, y: particle.targetY }, particle.alpha);
      }
      context.globalAlpha = 1;
    };

    const draw = (now: number) => {
      if (!running) return;
      const delta = Math.min((now - last) / 1000, 0.05);
      last = now;
      const seconds = now / 1000;
      context.clearRect(0, 0, width, height);

      for (const particle of particles) {
        if (particle.pull > 0) {
          const breathX = Math.sin(seconds * 0.8 + particle.phase) * particle.drift;
          const breathY = Math.cos(seconds * 0.6 + particle.phase) * particle.drift;
          particle.x += (particle.targetX + breathX - particle.x) * particle.pull;
          particle.y += (particle.targetY + breathY - particle.y) * particle.pull;
        } else {
          particle.y -= particle.drift * delta * 6;
          particle.x += Math.sin(seconds * 0.3 + particle.phase) * delta * 6;
          if (particle.y < -4) {
            particle.y = height + 4;
            particle.x = (particle.x + width * 0.37) % width;
          }
        }

        // Part around the cursor; the glyph's own pull reforms the word.
        if (pointer.active) {
          const dx = particle.x - pointer.x;
          const dy = particle.y - pointer.y;
          const distSq = dx * dx + dy * dy;
          if (distSq < REPEL_RADIUS * REPEL_RADIUS && distSq > 0.5) {
            const dist = Math.sqrt(distSq);
            const force = (1 - dist / REPEL_RADIUS) * REPEL_FORCE;
            particle.x += (dx / dist) * force;
            particle.y += (dy / dist) * force;
          }
        }

        const twinkle = 0.8 + 0.2 * Math.sin(seconds * 1.4 + particle.phase);
        paint(particle, particle.alpha * twinkle);
      }

      context.globalAlpha = 1;
      frame = requestAnimationFrame(draw);
    };

    const start = () => {
      if (!initialized || running || disposed || reduced.matches) return;
      running = true;
      last = performance.now();
      frame = requestAnimationFrame(draw);
    };
    const stop = () => {
      running = false;
      cancelAnimationFrame(frame);
    };

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      if (width === 0 || height === 0) return;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      particles = seedParticles(word, width, height);
      if (reduced.matches) paintStatic();
    };

    const initialize = () => {
      if (initialized || disposed) return;
      initialized = true;
      resize();
      // Re-sample once the webfont lands so the mask uses Instrument Serif,
      // not the fallback face.
      if (document.fonts && document.fonts.status !== "loaded") {
        void document.fonts.ready.then(() => {
          if (!disposed) resize();
        });
      }
    };

    const observer =
      typeof IntersectionObserver === "undefined"
        ? null
        : new IntersectionObserver((entries) => {
            for (const entry of entries) {
              if (entry.isIntersecting) {
                initialize();
                start();
              } else {
                stop();
              }
            }
          });
    if (observer) {
      observer.observe(canvas);
    } else {
      initialize();
      start();
    }

    const onPointerMove = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      pointer.x = event.clientX - rect.left;
      pointer.y = event.clientY - rect.top;
      pointer.active =
        pointer.x > -REPEL_RADIUS &&
        pointer.x < rect.width + REPEL_RADIUS &&
        pointer.y > -REPEL_RADIUS &&
        pointer.y < rect.height + REPEL_RADIUS;
    };
    const onPointerLeave = () => {
      pointer.active = false;
    };
    const onVisibility = () => (document.hidden ? stop() : start());
    const onMotionChange = () => {
      if (!initialized) return;
      if (reduced.matches) {
        stop();
        paintStatic();
      } else {
        start();
      }
    };
    const onResize = () => {
      if (initialized) resize();
    };

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("resize", onResize);
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    document.addEventListener("pointerleave", onPointerLeave);
    reduced.addEventListener("change", onMotionChange);

    return () => {
      disposed = true;
      stop();
      observer?.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("pointerleave", onPointerLeave);
      reduced.removeEventListener("change", onMotionChange);
    };
  }, [word]);

  return <canvas aria-hidden="true" className={className} ref={ref} />;
}
