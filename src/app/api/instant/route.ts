/**
 * Instant twin — the try-before-signup wow. No auth. A visitor supplies a
 * name + one source (URL or text); we build an ephemeral twin (24h TTL,
 * tiny caps, aggressive rate limits) and return its slug for chatting.
 */
import { NextRequest } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase/server";
import { ingest, IngestError } from "@/lib/ingest";
import { reindexTwin } from "@/lib/rag/engine";
import { EPHEMERAL_CAPS } from "@/lib/caps";
import { rateLimitDistributed, clientIp } from "@/lib/ratelimit";

export const maxDuration = 120;

const Body = z.object({
  name: z.string().min(1).max(60),
  sourceType: z.enum(["manual", "blog", "youtube", "linkedin"]),
  payload: z.string().min(1).max(200_000),
});

export async function POST(req: NextRequest) {
  const ip = clientIp(req);
  // 3 instant twins per IP per hour — the wow is cheap but not free. Shared
  // across instances so it can't be bypassed by hitting different lambdas.
  if (!(await rateLimitDistributed(`instant:${ip}`, 3, 60 * 60_000))) {
    return Response.json(
      { error: "You've made a few preview twins already — sign up to build a real one." },
      { status: 429 }
    );
  }

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid request." }, { status: 400 });
  const { name, sourceType, payload } = parsed.data;

  try {
    const ingested = await ingest({ sourceType, payload });
    const capped =
      ingested.text.split(/\s+/).slice(0, EPHEMERAL_CAPS.max_words).join(" ");

    const db = supabaseAdmin();
    const slug = `preview-${crypto.randomUUID().slice(0, 8)}`;
    const { data: twin, error } = await db
      .from("twins")
      .insert({
        slug,
        name,
        status: "live",
        is_ephemeral: true,
        expires_at: new Date(Date.now() + 24 * 3600_000).toISOString(),
      })
      .select("id")
      .single();
    if (error) throw error;

    await db.from("sources").insert({
      twin_id: twin.id,
      type: ingested.type,
      title: ingested.title,
      url: ingested.url,
      raw_text: capped,
      word_count: Math.min(ingested.wordCount, EPHEMERAL_CAPS.max_words),
      meta: ingested.meta,
    });
    await reindexTwin(twin.id);

    return Response.json({ slug, expiresInHours: 24 });
  } catch (e) {
    if (e instanceof IngestError) {
      return Response.json({ error: e.userMessage, code: e.code }, { status: 422 });
    }
    console.error("instant twin error", e);
    return Response.json({ error: "Couldn't build the preview twin." }, { status: 500 });
  }
}
