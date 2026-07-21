import Link from "next/link";
import InstantTwin from "@/components/InstantTwin";

/* Landing per "Hiy Mockups.dc.html" §1a — warm & human, one terracotta
   accent, Instrument Serif display. Copy adapted to shipped features only
   (no voice/email claims yet). */

const FEATURES = [
  {
    t: "Cites its sources",
    d: "Every grounded answer links back to the talk, post, or chapter it came from — by default, never a paid add-on.",
  },
  {
    t: "Says “I don't know”",
    d: "When a question falls outside your content, your hiy admits it in your tone instead of improvising in your name.",
  },
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
        {["Blog · 46 posts", "YouTube · 84", "PDF", "Interview"].map((c) => (
          <span key={c} className="rounded-full border border-white/15 px-2.5 py-1 text-[10px] text-white/60">
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
          <span key={i} className="w-1.5 rounded-full bg-accent/70" style={{ height: `${h * 4}px` }} />
        ))}
      </div>
    ),
  },
  {
    n: "3 — Share",
    d: "Get hiy.ai/you — a link anyone can visit. Or drop the widget straight onto your site.",
    art: (
      <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-[11px] text-white/80">
        hiy.ai/<b className="text-white">you</b> <span className="text-accent">↗</span>
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
          <Link href="/app" className="px-2 text-[13px] font-medium text-inksoft transition hover:text-ink">
            Log in
          </Link>
          <Link
            href="/app"
            className="rounded-full bg-dark px-4.5 py-2 text-[13px] font-semibold text-white transition hover:bg-accent"
          >
            Create your hiy
          </Link>
        </div>
      </nav>

      {/* hero */}
      <header className="relative mx-auto max-w-4xl px-6 pb-16 pt-16 text-center sm:pt-20">
        <div className="pointer-events-none absolute -left-40 top-0 h-96 w-96 rounded-full bg-accentsoft blur-3xl" aria-hidden />
        <div className="pointer-events-none absolute -right-40 top-24 h-96 w-96 rounded-full bg-[#e7e0f0] blur-3xl" aria-hidden />
        <p className="relative text-[11px] font-semibold uppercase tracking-[0.18em] text-accent">
          Your AI self
        </p>
        <h1 className="font-display relative mt-5 text-[clamp(2.6rem,6vw,4.4rem)] leading-[1.04] tracking-[-0.01em] [text-wrap:balance]">
          Be there for everyone,
          <br />
          <em className="text-accent">even when you can&apos;t be.</em>
        </h1>
        <p className="relative mx-auto mt-6 max-w-xl text-lg leading-relaxed text-inksoft">
          hiy learns from everything you&apos;ve written, recorded, and said —
          then answers your people in your words, any hour, anywhere. Honestly.
        </p>
        <div className="relative mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link href="/app" className="btn-warm px-7 py-3.5 text-sm">
            Create your hiy — free
          </Link>
          <a
            href="#try"
            className="rounded-full border border-line bg-surface px-7 py-3.5 text-sm font-medium text-inksoft transition hover:border-ink hover:text-ink"
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
          {[
            {
              init: "MC",
              name: "Maya Chen",
              role: "Startup coach — example hiy",
              qs: ["How do I price my first product?", "When should I raise vs. bootstrap?"],
            },
          ].map((p) => (
            <div key={p.name} className="hidden rounded-2xl border border-line bg-surface p-5 lg:block">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-accent font-display text-sm text-white">
                  {p.init}
                </span>
                <div>
                  <p className="text-sm font-semibold">{p.name}</p>
                  <p className="text-xs text-inkfaint">{p.role}</p>
                </div>
              </div>
              <div className="mt-3.5 space-y-2">
                {p.qs.map((q) => (
                  <p key={q} className="rounded-full border border-line px-3.5 py-2 text-xs text-inksoft">
                    {q}
                  </p>
                ))}
              </div>
            </div>
          ))}
          <InstantTwin />
          <div className="hidden rounded-2xl border border-line bg-surface p-5 lg:block">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-green font-display text-sm text-white">
                AO
              </span>
              <div>
                <p className="text-sm font-semibold">Dr. Ade Okafor</p>
                <p className="text-xs text-inkfaint">Nutrition educator — example hiy</p>
              </div>
            </div>
            <div className="mt-3.5 space-y-2">
              {["Is intermittent fasting right for me?", "What does your book say about sugar?"].map((q) => (
                <p key={q} className="rounded-full border border-line px-3.5 py-2 text-xs text-inksoft">
                  {q}
                </p>
              ))}
            </div>
          </div>
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
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {STEPS.map((s) => (
              <div key={s.n} className="rounded-2xl border border-white/10 bg-white/[0.04] p-6">
                <p className="font-display text-lg text-accent">{s.n}</p>
                <div className="mt-4 flex min-h-14 items-center rounded-xl border border-white/8 bg-white/[0.03] p-3.5">
                  {s.art}
                </div>
                <p className="mt-4 text-sm leading-relaxed text-white/70">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* more than a chatbot */}
      <section className="mx-auto max-w-6xl px-6 py-20 sm:px-10">
        <h2 className="font-display text-center text-[clamp(2rem,4vw,3rem)]">
          More than a chatbot
        </h2>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.t} className="rounded-2xl border border-line bg-surface p-5">
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
        <Link href="/app" className="btn-warm mt-8 inline-block px-8 py-3.5 text-sm">
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
