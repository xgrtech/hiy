import Link from "next/link";

/* Pricing per "Hiy Mockups.dc.html" §1b. Billing isn't wired yet (Stripe is
   phase 3): every CTA routes to /app and paid tiers are labeled "soon" so
   nothing pretends to charge. */

export const metadata = { title: "Pricing — hiy.ai" };

const TIERS = [
  {
    name: "Starter",
    price: "$0",
    per: "forever",
    features: ["Public hiy.ai/you link", "Text chat", "10k training words", "5 MB file uploads"],
    cta: "Get started",
    dark: false,
    soon: false,
  },
  {
    name: "Plus",
    price: "$19",
    per: "/mo",
    features: ["Embed widget", "Blog + YouTube bulk sync", "500k training words", "Everything in Starter"],
    cta: "Coming soon",
    dark: true,
    soon: true,
  },
  {
    name: "Pro",
    price: "$79",
    per: "/mo",
    features: ["2M training words", "Bring your own model keys", "Priority support", "Everything in Plus"],
    cta: "Coming soon",
    dark: false,
    soon: true,
  },
  {
    name: "Studio",
    price: "$299",
    per: "/mo",
    features: ["Unlimited training words", "Full custom branding", "Dedicated support", "Everything in Pro"],
    cta: "Talk to us",
    dark: false,
    soon: true,
  },
];

const FAQ = [
  {
    q: "Who owns my content and my hiy?",
    a: "You do — always. Export or delete everything at any time. Your content trains your hiy alone, never shared models.",
  },
  {
    q: "What does my hiy do when it doesn't know?",
    a: "It says so, in your tone. Citations and honest \"I don't know\" answers are defaults on every plan — never paywalled.",
  },
  {
    q: "When do paid plans launch?",
    a: "Billing is coming; everything currently shipped is free while we launch. Paid tiers unlock scale (more words, embeds everywhere, custom branding) — honesty features never move behind a paywall.",
  },
];

export default function PricingPage() {
  return (
    <main className="mx-auto max-w-6xl px-6 pb-24 sm:px-10">
      <nav className="flex items-center justify-between py-5">
        <Link href="/" className="font-display text-2xl">
          hiy<span className="text-accent">.ai</span>
        </Link>
        <div className="flex items-center gap-2.5">
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

      <header className="pb-12 pt-14 text-center">
        <h1 className="font-display text-[clamp(2.4rem,5vw,3.6rem)] [text-wrap:balance]">
          Start free. Grow when ready.
        </h1>
        <p className="mt-3 text-[15px] text-inksoft">
          Free while we launch — paid tiers unlock scale, never honesty.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {TIERS.map((t) => (
          <div
            key={t.name}
            className={`lift relative rounded-2xl border p-6 ${
              t.dark
                ? "border-dark bg-dark text-white shadow-[0_24px_60px_rgba(10,37,64,.25)]"
                : "border-line bg-surface"
            }`}
          >
            {t.dark && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-accent px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
                Most popular
              </span>
            )}
            <p className={`text-sm font-semibold ${t.dark ? "text-white/80" : "text-inksoft"}`}>{t.name}</p>
            <p className="font-display mt-2 text-4xl">
              {t.price}
              <span className={`ml-1 text-sm ${t.dark ? "text-white/50" : "text-inkfaint"}`}>{t.per}</span>
            </p>
            <ul className={`mt-5 space-y-2.5 text-[13px] ${t.dark ? "text-white/75" : "text-inksoft"}`}>
              {t.features.map((f) => (
                <li key={f} className="flex gap-2">
                  <span className={t.dark ? "text-accent" : "text-green"}>✓</span> {f}
                </li>
              ))}
            </ul>
            <Link
              href={t.name === "Studio" ? "mailto:hello@hiy.ai" : "/app"}
              className={`mt-6 block rounded-full px-5 py-2.5 text-center text-sm font-semibold transition ${
                t.dark
                  ? "btn-warm"
                  : "border border-line text-ink hover:border-ink"
              } ${t.soon && !t.dark ? "opacity-70" : ""}`}
            >
              {t.cta}
            </Link>
          </div>
        ))}
      </div>

      <section className="mx-auto mt-20 max-w-2xl">
        <h2 className="font-display text-center text-3xl">Questions, answered</h2>
        <div className="mt-8 space-y-3">
          {FAQ.map((f) => (
            <div key={f.q} className="rounded-2xl border border-line bg-surface p-5">
              <p className="text-sm font-semibold">{f.q}</p>
              <p className="mt-1.5 text-sm leading-relaxed text-inksoft">{f.a}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
