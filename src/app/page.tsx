import Link from "next/link";
import type { CSSProperties } from "react";
import { Quote, ArrowUpRight } from "lucide-react";
import InstantTwin from "@/components/InstantTwin";
import ExampleTwinCard from "@/components/fx/ExampleTwinCard";
import OnView from "@/components/fx/OnView";
import PlatformMock from "@/components/fx/PlatformMock";
import ThemeToggle from "@/components/ThemeToggle";

/* Landing per "Hiy Mockups.dc.html" §1a — warm & human, one terracotta
   accent, Instrument Serif display. Copy adapted to shipped features only
   (no voice/email claims yet). */

/* The two signature behaviors get featured cards that show the real UI
   artifact; the rest stay compact. Breaks the identical-grid monotony. */
const FEATURED = [
  {
    t: "Cites its sources",
    d: "Every grounded answer links back to the talk, post, or chapter it came from — by default, never a paid add-on.",
    artifact: (
      <span className="chip-cite">
        <Quote className="h-2.5 w-2.5" /> From: Pricing 101 — blog
      </span>
    ),
  },
  {
    t: "Says “I don't know”",
    d: "When a question falls outside your content, your hiy admits it in your tone instead of improvising in your name.",
    artifact: (
      <span className="inline-block rounded-xl border-[1.5px] border-dashed border-line px-3 py-1.5 text-xs text-inksoft">
        I don&apos;t have that in my knowledge yet.
      </span>
    ),
  },
];

const FEATURES = [
  {
    t: "Sounds like you",
    d: "A short interview distills your tone, takes, and boundaries into a persona — answers phrased the way you'd phrase them.",
  },
  {
    t: "Feeds on whole libraries",
    d: "Import an entire blog from its sitemap or a full YouTube channel in one go. It becomes one clean knowledge base.",
  },
  {
    t: "Lives on your site",
    d: "An embeddable widget plus deep links that auto-ask your best question. hiy.ai/you goes wherever your bio goes.",
  },
  {
    t: "You stay in control",
    d: "Read everything it knows, correct anything it says, set off-limits topics. Corrections override everything else.",
  },
];

const STEPS = [
  {
    n: "1 — Feed",
    d: "Paste links, sync your blog or YouTube, drop in PDFs. It builds from what you've already made.",
    art: (
      <div className="flex flex-wrap gap-1.5">
        {["Blog · 46 posts", "YouTube · 84", "PDF", "Interview"].map((c, i) => (
          <span
            key={c}
            style={{ "--i": i } as CSSProperties}
            className="ov-chip rounded-full border border-white/15 px-2.5 py-1 text-[10px] text-white/60"
          >
            {c}
          </span>
        ))}
      </div>
    ),
  },
  {
    n: "2 — Learn",
    d: "Not just what you know — how you say it. Answers sound like you, not a generic assistant.",
    art: (
      <div className="flex h-8 items-end gap-1">
        {[3, 6, 4, 8, 5, 7, 3, 6, 4, 5, 7, 4].map((h, i) => (
          <span
            key={i}
            className="ov-bar w-1.5 rounded-full bg-accent/70"
            style={{ height: `${h * 4}px`, "--i": i } as CSSProperties}
          />
        ))}
      </div>
    ),
  },
  {
    n: "3 — Share",
    d: "Get hiy.ai/you — a link anyone can visit. Or drop the widget straight onto your site.",
    art: (
      <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-[11px] text-white/80">
        hiy.ai/<b className="text-white">you</b>{" "}
        <ArrowUpRight className="h-3 w-3 text-accent" />
      </span>
    ),
  },
];

export default function Landing() {
  return (
    <main className="relative overflow-hidden">
      {/* nav — centered pill group per mockup */}
      <nav className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-6 py-5 sm:px-10">
        <div className="font-display text-2xl">
          hiy<span className="text-accent">.ai</span>
        </div>
        <div className="hidden items-center gap-1 rounded-full border border-line bg-surface p-1 text-[13px] text-inksoft md:flex">
          <a href="#how" className="rounded-full px-4 py-1.5 transition hover:text-ink">How it works</a>
          <a href="#try" className="rounded-full px-4 py-1.5 transition hover:text-ink">Try it</a>
          <Link href="/pricing" className="rounded-full px-4 py-1.5 transition hover:text-ink">Pricing</Link>
        </div>
        <div className="flex items-center gap-2.5">
          <ThemeToggle />
          <Link href="/app" className="px-2 text-[13px] font-medium text-inksoft transition hover:text-ink">
            Log in
          </Link>
          <Link
            href="/app"
            className="rounded-full bg-dark px-4.5 py-2 text-[13px] font-semibold text-white transition hover:opacity-90"
          >
            Create your hiy
          </Link>
        </div>
      </nav>

      {/* Stripe-signature diagonal gradient band: one vivid moment, sweeping
          the hero's top-right, content sits above it. */}
      <div
        aria-hidden
        className="gradient-band pointer-events-none absolute -top-64 right-[-22%] h-[420px] w-[58%] -rotate-[12deg] rounded-[56px] opacity-90"
      />

      {/* hero */}
      <header className="relative mx-auto max-w-4xl px-6 pb-16 pt-16 text-center sm:pt-20">
        <h1 className="font-display relative text-[clamp(2.6rem,6vw,4.4rem)] leading-[1.04] tracking-[-0.01em] [text-wrap:balance]">
          Be there for everyone,
          <br />
          <em className="text-accent">even when you can&apos;t be.</em>
        </h1>
        <p className="relative mx-auto mt-6 max-w-xl text-lg leading-relaxed text-inksoft">
          hiy learns from what you&apos;ve already written and said, then answers
          your audience&apos;s repeat questions the way you would — cited, honest,
          and available while you&apos;re not.
        </p>
        <div className="relative mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link href="/app" className="btn-warm press px-7 py-3.5 text-sm">
            Create your hiy — free
          </Link>
          <a
            href="#try"
            className="press rounded-full border border-line bg-surface px-7 py-3.5 text-sm font-medium text-inksoft transition hover:border-ink hover:text-ink"
          >
            Try a 30-second preview
          </a>
        </div>
        <p className="relative mt-4 text-xs text-inkfaint">
          Live in under 5 minutes · No credit card
        </p>
      </header>

      {/* try strip — the real conversion object, flanked by honest examples */}
      <section id="try" className="mx-auto max-w-6xl px-6 pb-24 sm:px-10">
        <p className="mb-6 text-center text-[11px] font-semibold uppercase tracking-[0.18em] text-inkfaint">
          Make one right now — no account
        </p>
        <div className="mx-auto grid max-w-5xl items-center gap-6 lg:grid-cols-[1fr_1.2fr_1fr]">
          <ExampleTwinCard
            initials="MC"
            name="Maya Chen"
            role="Startup coach · example"
            avatarClass="bg-accent"
            exchanges={[
              {
                q: "How do I price my first product?",
                a: "Anchor it to the outcome, never your hours — I walk through the math in my pricing guide.",
                cite: "Pricing 101 — blog",
              },
              {
                q: "Raise or bootstrap?",
                a: "Bootstrap until the product sells without you in the room. Then raising is a choice, not a rescue.",
                cite: "Ep. 12 — Raise vs bootstrap",
              },
            ]}
          />
          <InstantTwin />
          <ExampleTwinCard
            initials="AO"
            name="Dr. Ade Okafor"
            role="Nutritionist · example"
            avatarClass="bg-green"
            exchanges={[
              {
                q: "What does your book say about sugar?",
                a: "Cut the drinkable sugar first — that's chapter four's whole argument.",
                cite: "The Balanced Plate, ch. 4",
              },
              {
                q: "What's your take on keto for athletes?",
                a: "I don't have that in Ade's knowledge yet — try the book's chapters on everyday nutrition instead.",
              },
            ]}
          />
        </div>
      </section>

      {/* the product itself — Stripe-style platform mockup */}
      <section className="mx-auto max-w-6xl px-6 pb-24 sm:px-10">
        <h2 className="font-display text-center text-[clamp(1.9rem,3.5vw,2.6rem)] [text-wrap:balance]">
          See every question. Teach every gap.
        </h2>
        <p className="mx-auto mt-2 max-w-lg text-center text-sm text-inksoft">
          Watch conversations arrive, spot what your hiy couldn&apos;t answer,
          teach it in a click, and publish when it sounds like you.
        </p>
        <div className="mt-10">
          <PlatformMock />
        </div>
      </section>

      {/* dark: three steps */}
      <section id="how" className="bg-dark px-6 py-20 text-white sm:px-10">
        <div className="mx-auto max-w-6xl">
          <h2 className="font-display text-center text-[clamp(2rem,4vw,3rem)] [text-wrap:balance]">
            Three steps to your hiy
          </h2>
          <p className="mt-2 text-center text-sm text-white/60">
            Feed it your content. It learns your voice. Share it with the world.
          </p>
          <OnView className="mt-12 grid gap-5 md:grid-cols-3">
            {STEPS.map((s) => (
              <div
                key={s.n}
                className="h-full rounded-2xl border border-white/10 bg-white/[0.04] p-6 transition-colors duration-300 hover:border-white/25 hover:bg-white/[0.06]"
              >
                <p className="font-display text-lg text-accent">{s.n}</p>
                <div className="mt-4 flex min-h-14 items-center rounded-xl border border-white/8 bg-white/[0.03] p-3.5">
                  {s.art}
                </div>
                <p className="mt-4 text-sm leading-relaxed text-white/70">{s.d}</p>
              </div>
            ))}
          </OnView>
        </div>
      </section>

      {/* more than a chatbot */}
      <section className="mx-auto max-w-6xl px-6 py-20 sm:px-10">
        <h2 className="font-display text-center text-[clamp(2rem,4vw,3rem)]">
          An AI that shows its work
        </h2>
        <p className="mx-auto mt-2 max-w-lg text-center text-sm text-inksoft">
          Trust is the feature. Every answer is grounded in your real content —
          and when it isn&apos;t sure, it says so.
        </p>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-12">
          {FEATURED.map((f) => (
            <div
              key={f.t}
              className="lift h-full rounded-2xl border border-line bg-surface p-6 transition-colors hover:border-accent/40 lg:col-span-6"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <h3 className="font-display text-xl">{f.t}</h3>
                {f.artifact}
              </div>
              <p className="mt-2 max-w-md text-sm leading-relaxed text-inksoft">{f.d}</p>
            </div>
          ))}
          {FEATURES.map((f) => (
            <div
              key={f.t}
              className="lift h-full rounded-2xl border border-line bg-surface p-5 transition-colors hover:border-accent/40 lg:col-span-3"
            >
              <h3 className="text-[15px] font-semibold">{f.t}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-inksoft">{f.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* closing */}
      <section className="px-6 pb-20 pt-6 text-center">
        <h2 className="font-display text-[clamp(2.2rem,5vw,3.6rem)] leading-tight [text-wrap:balance]">
          Your people are asking.
          <br />
          <em className="text-accent">Say hiy.</em>
        </h2>
        <Link href="/app" className="btn-warm press mt-8 inline-block px-8 py-3.5 text-sm">
          Create your free hiy
        </Link>
      </section>

      <footer className="border-t border-line px-6 py-8 sm:px-10">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 text-xs text-inkfaint">
          <span className="font-display text-base text-ink">
            hiy<span className="text-accent">.ai</span>
          </span>
          <span className="flex gap-5">
            <Link href="/pricing" className="hover:text-ink">Pricing</Link>
            <a href="mailto:hello@hiy.ai" className="hover:text-ink">Contact</a>
          </span>
          <span>© 2026 hiy.ai — clearly labeled AI, always</span>
        </div>
      </footer>
    </main>
  );
}
