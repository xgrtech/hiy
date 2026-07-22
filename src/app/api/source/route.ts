/** Delete a source from YOUR twin, then reindex what remains. */
import { NextRequest } from "next/server";
import { z } from "zod";
import { supabaseServer, supabaseAdmin } from "@/lib/supabase/server";
import { reindexTwin } from "@/lib/rag/engine";
import { rateLimit, clientIp } from "@/lib/ratelimit";

export const maxDuration = 300;

const Body = z.object({
  twinId: z.string().uuid(),
  sourceId: z.string().uuid(),
});

export async function DELETE(req: NextRequest) {
  if (!rateLimit(`source-del:${clientIp(req)}`, 10, 60_000)) {
    return Response.json({ error: "Too many requests." }, { status: 429 });
  }

  const sb = await supabaseServer();
  const { data: auth } = await sb.auth.getUser();
  if (!auth.user) return Response.json({ error: "Sign in first." }, { status: 401 });

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }
  const { twinId, sourceId } = parsed.data;

  const db = supabaseAdmin();
  const { data: twin } = await db
    .from("twins")
    .select("id, owner_id")
    .eq("id", twinId)
    .single();
  if (!twin || twin.owner_id !== auth.user.id) {
    return Response.json({ error: "Twin not found." }, { status: 404 });
  }

  const { error } = await db
    .from("sources")
    .delete()
    .eq("id", sourceId)
    .eq("twin_id", twinId);
  if (error) {
    console.error("source delete error", error);
    return Response.json({ error: "Couldn't delete that source." }, { status: 500 });
  }

  try {
    const numChunks = await reindexTwin(twinId);
    // Nothing left to answer from → auto-unpublish. (We don't auto-publish on
    // add, but a live twin with an empty index must not stay public.)
    if (numChunks === 0) {
      await db.from("twins").update({ status: "draft" }).eq("id", twinId);
    }
    return Response.json({ numChunks });
  } catch (e) {
    console.error("post-delete reindex error", e);
    return Response.json({ error: "Deleted, but re-indexing failed. Hit re-index in Knowledge." }, { status: 500 });
  }
}
