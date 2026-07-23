/** Public hiy profile per "Hiy Mockups" §4a/5b: hiy.ai/{username}. */
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { supabaseAdmin, supabaseServer } from "@/lib/supabase/server";
import TwinChat from "@/components/TwinChat";
import ClaimCTA from "@/components/ClaimCTA";

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
      "id,slug,name,role_line,bio,greeting,avatar_url,links,appearance,suggested_questions,status,is_ephemeral,expires_at,owner_id"
    )
    .eq("slug", slug)
    .single();

  if (!twin) notFound();
  // Draft twins are private — visible only to their owner (private preview).
  if (twin.status !== "live" && !twin.is_ephemeral) {
    const sb = await supabaseServer();
    const { data: auth } = await sb.auth.getUser();
    if (!auth.user || auth.user.id !== twin.owner_id) notFound();
  }
  const expired =
    twin.is_ephemeral && twin.expires_at && new Date(twin.expires_at) < new Date();

  const [{ count: conversations }, { count: sourceCount }] = await Promise.all([
    db.from("chat_sessions").select("id", { count: "exact", head: true }).eq("twin_id", twin.id),
    db.from("sources").select("id", { count: "exact", head: true }).eq("twin_id", twin.id),
  ]);

  const suggested = ((twin.suggested_questions as string[]) ?? []).slice(0, 4);
  const links = ((twin.links as TwinLink[]) ?? []).slice(0, 6);
  const accent = (twin.appearance as { accent?: string } | null)?.accent;
  const initialQuestion = typeof q === "string" ? q.slice(0, 500) : undefined;

  return (
    <main
      className="relative flex min-h-screen flex-col overflow-hidden"
      style={accent ? ({ "--accent": accent } as React.CSSProperties) : undefined}
    >
      {/* soft peach glow, per mockup */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-32 -top-40 h-[480px] w-[480px] rounded-full opacity-70 blur-3xl"
        style={{ background: "radial-gradient(circle, #f2c9b2 0%, transparent 65%)" }}
      />

      <nav className="relative z-10 flex items-center justify-between px-5 py-5 sm:px-8">
        <Link href="/" className="font-display text-xl text-ink">
          hiy<span className="text-accent">.ai</span>
        </Link>
        <Link
          href="/"
          className="rounded-full border border-line bg-surface px-4 py-1.5 text-xs font-medium text-inksoft transition hover:border-ink hover:text-ink"
        >
          Create your own hiy
        </Link>
      </nav>

      <div className="relative z-10 mx-auto w-full max-w-xl flex-1 px-5 pb-8 pt-6 text-center sm:pt-10">
        {twin.is_ephemeral && !expired && (
          <p className="mx-auto mb-6 rounded-2xl bg-accentsoft px-4 py-2.5 text-sm text-accentdeep">
            24-hour preview.{" "}
            <ClaimCTA slug={twin.slug} className="font-semibold underline">
              Sign up free
            </ClaimCTA>{" "}
            to keep it — everything it learned moves to hiy.ai/your-name.
          </p>
        )}

        {expired ? (
          <div className="rounded-3xl border border-line bg-surface p-8">
            <p className="font-display text-2xl">This preview has expired.</p>
            <p className="mt-2 text-sm text-inksoft">
              Previews last 24 hours.{" "}
              <Link href="/" className="font-semibold text-accent underline">
                Make a new one
              </Link>{" "}
              or sign up to build a permanent hiy.
            </p>
          </div>
        ) : (
          <>
            {twin.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={twin.avatar_url}
                alt={`${twin.name}'s photo`}
                className="ring-ava mx-auto h-24 w-24 rounded-full object-cover"
              />
            ) : (
              <span className="ring-ava mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-accent font-display text-3xl text-white">
                {twin.name
                  .split(" ")
                  .map((w: string) => w[0])
                  .slice(0, 2)
                  .join("")}
              </span>
            )}

            <h1 className="font-display mt-5 text-4xl">{twin.name}</h1>
            {twin.role_line && (
              <p className="mt-1.5 text-sm text-inksoft">{twin.role_line}</p>
            )}
            {twin.bio && (
              <p className="mx-auto mt-3 max-w-md text-[15px] leading-relaxed text-inksoft">
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
                    className="inline-flex items-center gap-1 rounded-full border border-line bg-surface px-3 py-1 text-xs text-inksoft transition hover:border-accent hover:text-accent"
                  >
                    {l.label} <ArrowUpRight className="h-3 w-3" />
                  </a>
                ))}
              </p>
            )}

            <div className="mt-6">
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

            <p className="mt-5 flex items-center justify-center gap-2 text-[11px] text-inkfaint">
              <span className="h-1.5 w-1.5 rounded-full bg-green" />
              AI version of {twin.name} — may make mistakes. Every answer cites their real content.
            </p>
          </>
        )}
      </div>

      {/* stats bar */}
      <footer className="relative z-10 border-t border-line bg-surface/60 px-5 py-4">
        <div className="mx-auto flex max-w-xl flex-wrap items-center justify-center gap-x-6 gap-y-1 text-xs text-inksoft">
          <span>
            <b className="text-ink">{(conversations ?? 0).toLocaleString()}</b> conversations
          </span>
          <span>
            <b className="text-ink">{sourceCount ?? 0}</b> sources learned
          </span>
          <span>
            Powered by{" "}
            <Link href="/" className="font-semibold text-ink">
              hiy.ai
            </Link>
          </span>
          <Link href={`/report/${twin.slug}`} className="underline">
            Report
          </Link>
        </div>
      </footer>
    </main>
  );
}
