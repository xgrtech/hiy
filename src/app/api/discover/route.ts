/**
 * Bulk-import discovery for YOUR twin: list a site's pages (sitemap/feed)
 * or a channel's videos, plus the remaining caps budget so the UI can
 * preselect sensibly. Never ingests anything itself.
 */
import { NextRequest } from "next/server";
import { z } from "zod";
import { supabaseServer, supabaseAdmin } from "@/lib/supabase/server";
import { discoverSite, discoverChannel } from "@/lib/ingest/discover";
import { IngestError } from "@/lib/ingest";
import { capsForTwin } from "@/lib/caps";
import { rateLimit, clientIp } from "@/lib/ratelimit";

export const maxDuration = 120;

const Body = z.object({
  twinId: z.string().uuid(),
  kind: z.enum(["site", "channel"]),
  url: z.string().min(3).max(500),
});

export async function POST(req: NextRequest) {
  if (!rateLimit(`discover:${clientIp(req)}`, 5, 60_000)) {
    return Response.json({ error: "Too many requests." }, { status: 429 });
  }

  const sb = await supabaseServer();
  const { data: auth } = await sb.auth.getUser();
  if (!auth.user) return Response.json({ error: "Sign in first." }, { status: 401 });

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }
  const { twinId, kind, url } = parsed.data;

  const db = supabaseAdmin();
  const { data: twin } = await db
    .from("twins")
    .select("id, owner_id")
    .eq("id", twinId)
    .single();
  if (!twin || twin.owner_id !== auth.user.id) {
    return Response.json({ error: "Twin not found." }, { status: 404 });
  }

  try {
    const items =
      kind === "site" ? await discoverSite(url) : await discoverChannel(url);

    const caps = await capsForTwin(twinId);
    const { data: existing } = await db
      .from("sources")
      .select("word_count,type")
      .eq("twin_id", twinId);
    const rows = existing ?? [];
    const usedWords = rows.reduce((s, r) => s + (r.word_count ?? 0), 0);
    const usedSources = rows.filter(
      (r) => r.type !== "interview" && r.type !== "correction"
    ).length;

    return Response.json({
      items,
      budget: {
        remainingWords: Math.max(0, caps.max_words - usedWords),
        remainingSources: Math.max(0, caps.max_sources - usedSources),
      },
    });
  } catch (e) {
    if (e instanceof IngestError) {
      return Response.json(
        { error: e.userMessage, code: e.code, retryable: e.retryable },
        { status: 422 }
      );
    }
    console.error("discover error", e);
    return Response.json({ error: "Discovery failed. Try again." }, { status: 500 });
  }
}
