/** Rebuild YOUR twin's wiki + chunks (used once after a batch import). */
import { NextRequest } from "next/server";
import { z } from "zod";
import { supabaseServer, supabaseAdmin } from "@/lib/supabase/server";
import { reindexTwin } from "@/lib/rag/engine";
import { rateLimit, clientIp } from "@/lib/ratelimit";

export const maxDuration = 300;

const Body = z.object({ twinId: z.string().uuid() });

export async function POST(req: NextRequest) {
  if (!rateLimit(`reindex:${clientIp(req)}`, 4, 60_000)) {
    return Response.json({ error: "Too many requests." }, { status: 429 });
  }

  const sb = await supabaseServer();
  const { data: auth } = await sb.auth.getUser();
  if (!auth.user) return Response.json({ error: "Sign in first." }, { status: 401 });

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }

  const db = supabaseAdmin();
  const { data: twin } = await db
    .from("twins")
    .select("id, owner_id")
    .eq("id", parsed.data.twinId)
    .single();
  if (!twin || twin.owner_id !== auth.user.id) {
    return Response.json({ error: "Twin not found." }, { status: 404 });
  }

  try {
    // Preserve publish state across a re-index (crash-safe swap keeps the old
    // index live meanwhile). No auto-publish.
    const numChunks = await reindexTwin(twin.id);
    return Response.json({ numChunks });
  } catch (e) {
    console.error("reindex error", e);
    return Response.json({ error: "Re-indexing failed. Try again." }, { status: 500 });
  }
}
