/** Public twin page: hiy.ai/{username} (also serves preview twins). */
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
      className={`relative min-h-screen overflow-hidden px-5 py-10 ${accent ? "wash" : ""}`}
      style={accent ? ({ "--accent": accent } as React.CSSProperties) : undefined}
    >
      <div className="blob blob--1 -right-16 -top-32 h-[400px] w-[400px] bg-[#cfe9dd]" />
      <div className="blob blob--2 -left-24 top-56 h-[320px] w-[320px] bg-[#f3d9c8]" />

      <div className="relative z-10 mx-auto max-w-2xl">
        <div className="mb-6 text-center">
          {twin.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={twin.avatar_url}
              alt={`${twin.name}'s photo`}
              className="mx-auto mb-4 h-24 w-24 rounded-full border-2 border-line object-cover shadow-[0_10px_34px_rgba(28,27,24,.12)]"
            />
          ) : (
            <div className="orb mx-auto mb-4 h-24 w-24" />
          )}
          <h1 className="font-display text-3xl font-medium">{twin.name}</h1>
          {twin.role_line && (
            <p className="mt-1 text-[15px] text-inksoft">{twin.role_line}</p>
          )}
          {twin.bio && (
            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-inksoft">
              {twin.bio}
            </p>
          )}
          {links.length > 0 && (
            <p className="mt-3 flex flex-wrap items-center justify-center gap-2">
              {links.map((l) => (
                <a
                  key={l.url}
                  href={l.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-full border border-line bg-surface px-3 py-1 text-xs text-inksoft transition hover:border-accent hover:text-accent"
                >
                  {l.label} ↗
                </a>
              ))}
            </p>
          )}
          <p className="mx-auto mt-3 inline-flex items-center gap-2 rounded-full border border-line bg-surface px-4 py-1.5 text-xs text-inksoft">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            AI twin of {twin.name} — not the real person
          </p>
          {twin.is_ephemeral && !expired && (
            <p className="mt-3 rounded-2xl bg-accentsoft px-4 py-2.5 text-sm text-accent">
              This is a 24-hour preview twin.{" "}
              <Link href="/app" className="font-semibold underline">
                Sign up free
              </Link>{" "}
              to keep it, add more sources, and get hiy.ai/your-name.
            </p>
          )}
        </div>

        {expired ? (
          <div className="rounded-3xl border border-line bg-surface p-8 text-center">
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
          <TwinChat
            slug={twin.slug}
            name={twin.name}
            suggested={suggested}
            greeting={twin.greeting}
            initialQuestion={initialQuestion}
            avatarUrl={twin.avatar_url}
          />
        )}

        <p className="mt-6 text-center text-xs text-inkfaint">
          Powered by{" "}
          <Link href="/" className="font-semibold text-inksoft">
            hiy.ai
          </Link>{" "}
          · Answers are AI-generated and cite their sources ·{" "}
          <Link href={`/report/${twin.slug}`} className="underline">
            Report this twin
          </Link>
        </p>
        <p className="mt-2 text-center text-xs">
          <Link
            href="/"
            className="font-semibold text-accent underline decoration-dotted underline-offset-2"
          >
            Create your own twin →
          </Link>
        </p>
      </div>
    </main>
  );
}
