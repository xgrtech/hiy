/**
 * Complete a personality-interview session: store it as an `interview`
 * source, merge stated boundaries into guardrails, reindex + refresh persona.
 */
import { NextRequest } from "next/server";
import { z } from "zod";
import { supabaseServer, supabaseAdmin } from "@/lib/supabase/server";
import { reindexTwin } from "@/lib/rag/engine";
import { qaToTranscript, qaBoundaries, answeredCount } from "@/lib/interview/format";
import { capsForTwin, checkContentCaps } from "@/lib/caps";
import { rateLimit, clientIp } from "@/lib/ratelimit";

export const maxDuration = 300;

const MIN_ANSWERS = 3;

const Body = z.object({
  twinId: z.string().uuid(),
  qa: z
    .array(z.object({ q: z.string().min(1).max(500), a: z.string().max(4000) }))
    .min(1)
    .max(40),
});

export async function POST(req: NextRequest) {
  if (!rateLimit(`interview:${clientIp(req)}`, 4, 60_000)) {
    return Response.json({ error: "Too many requests." }, { status: 429 });
  }

  const sb = await supabaseServer();
  const { data: auth } = await sb.auth.getUser();
  if (!auth.user) return Response.json({ error: "Sign in first." }, { status: 401 });

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }
  const { twinId, qa } = parsed.data;

  if (answeredCount(qa) < MIN_ANSWERS) {
    return Response.json(
      { error: `Answer at least ${MIN_ANSWERS} questions so your twin actually learns something.` },
      { status: 422 }
    );
  }

  const db = supabaseAdmin();
  const { data: twin } = await db
    .from("twins")
    .select("id, owner_id, guardrail_topics")
    .eq("id", twinId)
    .single();
  if (!twin || twin.owner_id !== auth.user.id) {
    return Response.json({ error: "Twin not found." }, { status: 404 });
  }

  const transcript = qaToTranscript(qa);
  const words = transcript.split(/\s+/).filter(Boolean).length;

  const caps = await capsForTwin(twinId);
  const capCheck = await checkContentCaps(twinId, words, caps, "interview");
  if (capCheck !== "ok") {
    return Response.json(
      { error: "This would exceed your plan's training-content limit.", code: "cap_exceeded" },
      { status: 422 }
    );
  }

  try {
    const { data: source, error } = await db
      .from("sources")
      .insert({
        twin_id: twinId,
        type: "interview",
        title: "Personality interview",
        url: null,
        raw_text: transcript,
        word_count: words,
        meta: { qa },
      })
      .select("id")
      .single();
    if (error) throw error;

    const boundaries = qaBoundaries(qa);
    if (boundaries.length) {
      const merged = [
        ...new Set([...((twin.guardrail_topics as string[]) ?? []), ...boundaries]),
      ].slice(0, 20);
      await db.from("twins").update({ guardrail_topics: merged }).eq("id", twinId);
    }

    await db.from("twins").update({ status: "indexing" }).eq("id", twinId);
    const numChunks = await reindexTwin(twinId); // also refreshes persona
    await db.from("twins").update({ status: "live" }).eq("id", twinId);

    return Response.json({ sourceId: source.id, numChunks });
  } catch (e) {
    console.error("interview error", e);
    await db.from("twins").update({ status: "live" }).eq("id", twinId);
    return Response.json(
      { error: "Something went wrong saving your interview. Your answers are kept locally — try again." },
      { status: 500 }
    );
  }
}
