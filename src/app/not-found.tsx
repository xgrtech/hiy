import Link from "next/link";

/** Branded recovery page for missing / private / expired twins (and any
 *  unknown route) instead of the default Next 404. */
export default function NotFound() {
  return (
    <main className="wash-dawn flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <span className="orb mb-6 h-16 w-16" aria-hidden />
      <p className="font-display text-2xl">hiy<span className="text-accent">.ai</span></p>
      <h1 className="font-display mt-4 text-[clamp(2rem,5vw,3rem)] leading-tight">
        This hiy isn&apos;t here.
      </h1>
      <p className="mt-3 max-w-md text-sm leading-relaxed text-inksoft">
        The page you&apos;re looking for doesn&apos;t exist, isn&apos;t public yet, or the
        preview link expired. Check the address — or make your own.
      </p>
      <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
        <Link href="/app" className="btn-warm press px-6 py-3 text-sm">
          Create your hiy — free
        </Link>
        <Link
          href="/"
          className="press rounded-full border border-line bg-surface px-6 py-3 text-sm font-medium text-inksoft transition hover:border-ink hover:text-ink"
        >
          Back to home
        </Link>
      </div>
    </main>
  );
}
