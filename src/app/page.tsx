import Link from "next/link";
import InstantTwin from "@/components/InstantTwin";

export default function Landing() {
  return (
    <main className="relative overflow-hidden">
      {/* ambient hero background */}
      <div className="blob blob--1 -right-20 -top-28 h-[440px] w-[440px] bg-[#cfe9dd]" />
      <div className="blob blob--2 -left-28 top-44 h-[360px] w-[360px] bg-[#f3d9c8]" />

      <nav className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-7 py-6">
        <div className="text-xl font-bold tracking-tight">
          hiy<span className="text-accent">.ai</span>
        </div>
        <div className="hidden gap-8 text-sm text-inksoft sm:flex">
          <a href="#how">How it works</a>
          <a href="#trust">Why it&apos;s different</a>
        </div>
        <Link
          href="/app"
          className="rounded-full bg-ink px-5 py-2 text-sm font-medium text-paper transition hover:bg-accent"
        >
          Sign in
        </Link>
      </nav>

      <header className="relative z-10 mx-auto grid max-w-6xl items-center gap-12 px-7 pb-16 pt-12 lg:grid-cols-2">
        <div>
          <h1 className="font-display text-5xl font-medium leading-[1.05] tracking-tight sm:text-6xl">
            A twin that talks like you —{" "}
            <span className="relative whitespace-nowrap italic text-accent">
              honestly.
              <svg
                className="absolute -bottom-3 left-0 w-full"
                viewBox="0 0 190 20"
                fill="none"
                aria-hidden
              >
                <path className="doodle-path" d="M4,13 Q50,3 95,11 T186,9" />
              </svg>
            </span>
          </h1>
          <p className="mt-6 max-w-md text-lg text-inksoft">
            Point hiy.ai at your writing, talks, and videos. Get an AI twin that
            answers like you, cites its sources, and knows when to say{" "}
            <em className="font-display">&ldquo;I don&apos;t know.&rdquo;</em>
          </p>
          <p className="mt-4 text-sm text-inkfaint">
            Free at hiy.ai/your-name · No card required
          </p>
        </div>
        <InstantTwin />
      </header>

      <section id="how" className="relative z-10 mx-auto max-w-6xl px-7 py-16">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-accent">
          How it works
        </p>
        <h2 className="font-display mt-2 text-3xl font-medium">
          Three steps, no engineering.
        </h2>
        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {[
            {
              n: "1",
              t: "Connect your content",
              d: "Blog posts, YouTube videos, a résumé export, or pasted text — turned into one clean knowledge base, not scraped fragments.",
            },
            {
              n: "2",
              t: "We build your twin",
              d: "Indexed for meaning and wrapped in guardrails: honest, on-topic, and always labeled as AI.",
            },
            {
              n: "3",
              t: "Share & embed",
              d: "A public page at hiy.ai/you, plus an embed for your own site. Available to everyone, always.",
            },
          ].map((s) => (
            <div
              key={s.n}
              className="rounded-2xl border border-line bg-surface p-6 shadow-[0_1px_2px_rgba(28,27,24,.04),0_10px_34px_rgba(28,27,24,.07)] transition hover:-translate-y-1"
            >
              <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-xl bg-accentsoft font-semibold text-accent">
                {s.n}
              </div>
              <h3 className="font-semibold">{s.t}</h3>
              <p className="mt-1.5 text-sm text-inksoft">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="trust" className="relative z-10 mx-auto max-w-6xl px-7 py-16">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-accent">
          Why it&apos;s different
        </p>
        <h2 className="font-display mt-2 max-w-xl text-3xl font-medium">
          Most AI clones are confident. Yours will be honest.
        </h2>
        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {[
            {
              t: "Cited answers, always",
              d: "Every grounded reply shows which of your sources it drew from — not as a paid add-on, by default.",
            },
            {
              t: "“I don’t know” built in",
              d: "When your content doesn't cover something, your twin says so instead of improvising in your name.",
            },
            {
              t: "Clearly labeled AI",
              d: "Every twin discloses what it is. Impersonation is against the rules, and every page has a report link.",
            },
          ].map((f) => (
            <div key={f.t} className="rounded-2xl border border-line bg-surface2 p-6">
              <h3 className="font-semibold">{f.t}</h3>
              <p className="mt-1.5 text-sm text-inksoft">{f.d}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="relative z-10 border-t border-line py-10 text-center text-xs text-inkfaint">
        hiy.ai — your twin, honestly. ·{" "}
        <a href="mailto:hello@hiy.ai" className="underline">
          Contact
        </a>
      </footer>
    </main>
  );
}
