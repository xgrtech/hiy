/** Public twin page: hiy.ai/{username}. The arch card IS the product's face. */
import { notFound } from "next/navigation";
import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase/server";
import TwinChat from "@/components/TwinChat";

export const dynamic = "force-dynamic";

interface TwinLink {
  label: string;
  url: string;
}

export default async function TwinPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const { slug } = await params;
  const { q } = await searchParams;
  const db = supabaseAdmin();
  const { data: twin } = await db
    .from("twins")
    .select(
      "id,slug,name,role_line,bio,greeting,avatar_url,links,appearance,suggested_questions,status,is_ephemeral,expires_at"
    )
    .eq("slug", slug)
    .single();

  if (!twin || (twin.status !== "live" && !twin.is_ephemeral)) notFound();
  const expired =
    twin.is_ephemeral && twin.expires_at && new Date(twin.expires_at) < new Date();

  const suggested = ((twin.suggested_questions as string[]) ?? []).slice(0, 4);
  const links = ((twin.links as TwinLink[]) ?? []).slice(0, 6);
  const accent = (twin.appearance as { accent?: string } | null)?.accent;
  const initialQuestion = typeof q === "string" ? q.slice(0, 500) : undefined;

  return (
    <main
      className={`relative min-h-screen overflow-hidden px-4 pb-10 pt-6 sm:px-6 ${accent ? "wash" : ""}`}
      style={accent ? ({ "--accent": accent } as React.CSSProperties) : undefined}
    >
      {/* slim top bar: identity + growth loop */}
      <nav className="relative z-10 mx-auto mb-8 flex max-w-2xl items-center justify-between">
        <Link href="/" className="text-sm font-bold tracking-tight text-inksoft transition hover:text-ink">
          hiy<span className="text-accent2">.ai</span>
        </Link>
        <Link
          href="/"
          className="rounded-full border border-line bg-surface px-4 py-1.5 text-xs font-medium text-inksoft transition hover:border-ink hover:text-ink"
        >
          Create your own twin
        </Link>
      </nav>

      <div className="relative z-10 mx-auto max-w-2xl">
        {twin.is_ephemeral && !expired && (
          <p className="mx-auto mb-6 max-w-md rounded-2xl bg-accentsoft px-4 py-2.5 text-center text-sm text-accent">
            This is a 24-hour preview twin.{" "}
            <Link href="/app" className="font-semibold underline">
              Sign up free
            </Link>{" "}
            to keep it and get hiy.ai/your-name.
          </p>
        )}

        {expired ? (
          <div className="mx-auto max-w-md rounded-3xl border border-line bg-surface p-8 text-center">
            <p className="font-display text-xl">This preview twin has expired.</p>
            <p className="mt-2 text-sm text-inksoft">
              Preview twins last 24 hours.{" "}
              <Link href="/" className="font-semibold text-accent underline">
                Make a new one
              </Link>{" "}
              or sign up to build a permanent twin.
            </p>
          </div>
        ) : (
          <div className="arch arch-shadow mx-auto overflow-hidden border border-line bg-surface">
            {/* dome: portrait or orb */}
            {twin.avatar_url ? (
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={twin.avatar_url}
                  alt={`${twin.name}'s photo`}
                  className="h-72 w-full object-cover sm:h-80"
                />
                <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[rgba(20,18,14,0.72)] to-transparent" />
                <div className="absolute inset-x-0 bottom-0 px-6 pb-5 text-center text-white">
                  <h1 className="font-display text-3xl font-medium">{twin.name}</h1>
                  {twin.role_line && (
                    <p className="mt-0.5 text-sm text-white/85">{twin.role_line}</p>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center bg-[radial-gradient(120%_100%_at_50%_0%,var(--accent-soft)_0%,transparent_70%)] px-6 pb-4 pt-14 text-center">
                <div className="orb h-24 w-24" />
                <h1 className="font-display mt-4 text-3xl font-medium">{twin.name}</h1>
                {twin.role_line && (
                  <p className="mt-0.5 text-sm text-inksoft">{twin.role_line}</p>
                )}
              </div>
            )}

            <div className="px-5 pb-5 pt-4 sm:px-6">
              {twin.bio && (
                <p className="mx-auto mb-3 max-w-md text-center text-sm leading-relaxed text-inksoft">
                  {twin.bio}
                </p>
              )}
              {links.length > 0 && (
                <p className="mb-3 flex flex-wrap items-center justify-center gap-2">
                  {links.map((l) => (
                    <a
                      key={l.url}
                      href={l.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-full border border-line bg-paper px-3 py-1 text-xs text-inksoft transition hover:border-accent hover:text-accent"
                    >
                      {l.label} ↗
                    </a>
                  ))}
                </p>
              )}
              <p className="mb-4 flex items-center justify-center gap-2 text-[11px] text-inkfaint">
                <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                AI twin of {twin.name} — not the real person · answers cite their sources
              </p>

              <TwinChat
                slug={twin.slug}
                name={twin.name}
                suggested={suggested}
                greeting={twin.greeting}
                initialQuestion={initialQuestion}
                avatarUrl={twin.avatar_url}
                frameless
              />
            </div>
          </div>
        )}

        <p className="mt-6 text-center text-xs text-inkfaint">
          Powered by{" "}
          <Link href="/" className="font-semibold text-inksoft">
            hiy.ai
          </Link>{" "}
          ·{" "}
          <Link href={`/report/${twin.slug}`} className="underline">
            Report this twin
          </Link>
        </p>
      </div>
    </main>
  );
}
