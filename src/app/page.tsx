import Link from "next/link";
import InstantTwin from "@/components/InstantTwin";

/* Floating evidence around the hero: content stats, visitor questions,
   and the honesty moments (citations, "I don't know") — hiy's imagery. */
const ARTIFACTS = [
  { text: "Blog · 74 posts", cls: "left-[4%] top-[16%] hidden lg:block", tilt: "-7deg", delay: "0s" },
  { text: "YouTube · 28 videos", cls: "left-[10%] top-[46%] hidden lg:block", tilt: "5deg", delay: "1.2s" },
  { text: "Interview · 18 answers", cls: "left-[5%] top-[74%] hidden xl:block", tilt: "-4deg", delay: "2.1s" },
  { text: "London, UK — “What's your take on pricing?”", cls: "right-[3%] top-[14%] hidden lg:block max-w-52", tilt: "6deg", delay: "0.6s" },
  { text: "cited · 2 sources ✓", cls: "right-[12%] top-[44%] hidden lg:block", tilt: "-5deg", delay: "1.7s", accent: true },
  { text: "“Not in my sources yet — honestly, I don't know.”", cls: "right-[4%] top-[70%] hidden xl:block max-w-56", tilt: "4deg", delay: "2.6s", dashed: true },
];

const DEMO_CHAT = {
  q1: "What do you actually recommend for pricing a first product?",
  a1: "Start embarrassingly simple: one price, monthly, no tiers. I wrote about this after my first launch flopped — charge from day one, raise it every ten customers until people hesitate.",
  q2: "What's your favourite restaurant in Lisbon?",
  a2: "That's not in my knowledge yet — I honestly don't know. Ask me about launching products or pricing, that's where I can actually help.",
};

export default function Landing() {
  return (
    <main className="relative overflow-hidden">
      {/* ===== hero canvas ===== */}
      <section className="canvas relative mx-3 mt-3 overflow-hidden sm:mx-4 sm:mt-4">
        <nav className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-6 py-6 sm:px-10">
          <div className="text-xl font-bold tracking-tight">
            hiy<span className="text-accent2">.ai</span>
          </div>
          <div className="hidden gap-8 text-sm text-inksoft sm:flex">
            <a href="#honest" className="transition hover:text-ink">Why honest</a>
            <a href="#how" className="transition hover:text-ink">How it works</a>
          </div>
          <Link
            href="/app"
            className="rounded-full border border-line bg-surface px-5 py-2 text-sm font-medium transition hover:border-ink"
          >
            Sign in
          </Link>
        </nav>

        <div className="relative z-10 mx-auto max-w-6xl px-6 pb-16 pt-6 sm:px-10">
          {/* arch card + floating artifacts */}
          <div className="relative">
            {ARTIFACTS.map((a) => (
              <div
                key={a.text}
                className={`artifact ${a.cls} ${a.accent ? "!border-accent !text-accent" : ""} ${a.dashed ? "!border-dashed" : ""}`}
                style={{ "--tilt": a.tilt, "--float-delay": a.delay } as React.CSSProperties}
              >
                {a.text}
              </div>
            ))}
            <InstantTwin />
          </div>

          <h1 className="font-display mx-auto mt-12 max-w-3xl text-center text-[clamp(2.1rem,4vw,3.3rem)] font-medium leading-[1.08] tracking-[-0.02em] [text-wrap:balance]">
            <span className="text-inksoft">A twin that talks like you —</span>{" "}
            <span className="block">and knows when it doesn&apos;t know.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-center text-lg leading-relaxed text-inksoft">
            Point hiy at your writing, talks, and videos. Get a twin that answers
            in your voice, cites its sources, and never improvises in your name.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link href="/app" className="btn-warm px-7 py-3.5 text-sm">
              Create your twin — free
            </Link>
            <a
              href="#honest"
              className="rounded-full border border-line bg-surface px-7 py-3.5 text-sm font-medium text-inksoft transition hover:border-ink hover:text-ink"
            >
              Why honest matters
            </a>
          </div>
          <p className="mt-5 text-center text-xs text-inkfaint">
            hiy.ai/your-name · visitors always chat free · clearly labeled AI
          </p>
        </div>
      </section>

      {/* ===== the honesty demo ===== */}
      <section id="honest" className="mx-auto max-w-6xl px-6 py-24 sm:px-10">
        <div className="grid items-center gap-14 lg:grid-cols-[1fr_1.1fr]">
          <div>
            <h2 className="font-display text-[clamp(1.9rem,3.4vw,2.8rem)] font-medium leading-tight [text-wrap:balance]">
              Most AI clones improvise.
              <br />
              <span className="text-accent">Yours will cite — or admit it.</span>
            </h2>
            <p className="mt-5 max-w-md leading-relaxed text-inksoft">
              Every grounded answer shows which of your sources it drew from.
              And when a question falls outside your content, your twin says so —
              in your tone, without inventing a word. That&apos;s the default,
              never a paid add-on.
            </p>
            <ul className="mt-6 space-y-2.5 text-sm text-inksoft">
              <li className="flex items-center gap-2.5">
                <span className="chip-cite">cited ✓</span> sources named on every grounded reply
              </li>
              <li className="flex items-center gap-2.5">
                <span className="chip-idk">honest</span> &ldquo;I don&apos;t know&rdquo; is designed in, not patched on
              </li>
              <li className="flex items-center gap-2.5">
                <span className="chip-cite">labeled</span> every page discloses it&apos;s an AI twin
              </li>
            </ul>
          </div>

          {/* composed product demo — the real chat components' visual language */}
          <div className="rounded-[28px] border border-line bg-surface p-6 shadow-[0_1px_2px_rgba(28,27,24,.04),0_24px_70px_rgba(28,27,24,.1)]">
            <div className="mb-4 flex items-center gap-2.5 border-b border-line pb-4">
              <div className="orb h-8 w-8" />
              <div>
                <p className="text-sm font-semibold leading-tight">Maya&apos;s twin</p>
                <p className="text-[10px] text-inkfaint">AI twin — not the real person</p>
              </div>
            </div>
            <div className="space-y-3 text-sm leading-relaxed">
              <p className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-md bg-accent px-4 py-2.5 text-white">
                {DEMO_CHAT.q1}
              </p>
              <div>
                <p className="w-fit max-w-[88%] rounded-2xl rounded-bl-md bg-surface2 px-4 py-2.5">
                  {DEMO_CHAT.a1}
                </p>
                <p className="ml-1 mt-1.5 flex gap-1.5">
                  <span className="chip-cite">[1] Pricing my first product</span>
                  <span className="chip-cite">[2] Launch post-mortem</span>
                </p>
              </div>
              <p className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-md bg-accent px-4 py-2.5 text-white">
                {DEMO_CHAT.q2}
              </p>
              <div>
                <p className="w-fit max-w-[88%] rounded-2xl rounded-bl-md border border-dashed border-line bg-paper px-4 py-2.5">
                  {DEMO_CHAT.a2}
                </p>
                <p className="ml-1 mt-1.5">
                  <span className="chip-idk">honest answer — nothing invented</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== how it works: a real sequence ===== */}
      <section id="how" className="mx-auto max-w-6xl px-6 pb-24 sm:px-10">
        <h2 className="font-display text-center text-[clamp(1.9rem,3.4vw,2.8rem)] font-medium [text-wrap:balance]">
          From your content to your twin in minutes.
        </h2>
        <div className="relative mt-12 grid gap-10 md:grid-cols-3 md:gap-8">
          <div aria-hidden className="absolute left-[16%] right-[16%] top-5 hidden border-t-2 border-dashed border-line md:block" />
          {[
            {
              n: "1",
              t: "Feed it your world",
              d: "Import a whole blog or YouTube channel at once, upload files, paste anything. It becomes one clean knowledge base you can read and correct.",
            },
            {
              n: "2",
              t: "It learns your voice",
              d: "A short interview — your twin asks about your tone, takes, and boundaries — then a persona is distilled so it phrases things the way you would.",
            },
            {
              n: "3",
              t: "Share one link",
              d: "hiy.ai/your-name, ready for a bio line or your own site via the embed. Deep links can even auto-ask your best question.",
            },
          ].map((s) => (
            <div key={s.n} className="relative text-center md:px-2">
              <div className="relative z-10 mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-ink font-display text-lg text-paper">
                {s.n}
              </div>
              <h3 className="mt-4 font-semibold">{s.t}</h3>
              <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-inksoft">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ===== closing band: terracotta drench ===== */}
      <section className="mx-3 mb-3 overflow-hidden rounded-[clamp(20px,4vw,44px)] bg-accent2 px-6 py-20 text-center sm:mx-4 sm:mb-4">
        <h2 className="font-display mx-auto max-w-2xl text-[clamp(2rem,4.5vw,3.4rem)] font-medium leading-tight text-white [text-wrap:balance]">
          Your twin is 60 seconds away.
        </h2>
        <p className="mx-auto mt-4 max-w-md text-[15px] leading-relaxed text-white/85">
          Make a free preview from one blog post — no account. Keep it forever by
          claiming hiy.ai/your-name.
        </p>
        <Link
          href="/app"
          className="mt-8 inline-block rounded-full bg-white px-8 py-3.5 text-sm font-semibold text-accent2 transition hover:scale-[1.03]"
        >
          Create your twin
        </Link>
      </section>

      <footer className="py-10 text-center text-xs text-inkfaint">
        hiy.ai — your twin, honestly ·{" "}
        <a href="mailto:hello@hiy.ai" className="underline">Contact</a>
      </footer>
    </main>
  );
}
