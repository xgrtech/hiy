/**
 * Explicit publish / unpublish. Adding content no longer auto-publishes a
 * twin (a private review → publish gate); the creator decides when
 * hiy.ai/{slug} goes public. Publishing requires a built index so a live
 * twin can actually answer.
 */
import { NextRequest } from "next/server";
import { z } from "zod";
import { supabaseServer, supabaseAdmin } from "@/lib/supabase/server";

const Body = z.object({ publish: z.boolean() });

export async function POST(req: NextRequest) {
  const sb = await supabaseServer();
  const { data: auth } = await sb.auth.getUser();
  if (!auth.user) return Response.json({ error: "Sign in first." }, { status: 401 });

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid request." }, { status: 400 });
  const { publish } = parsed.data;

  const db = supabaseAdmin();
  const { data: twin } = await db
    .from("twins")
    .select("id, is_ephemeral")
    .eq("owner_id", auth.user.id)
    .maybeSingle();
  if (!twin || twin.is_ephemeral) {
    return Response.json({ error: "No twin to publish." }, { status: 404 });
  }

  if (publish) {
    const { count } = await db
      .from("chunks")
      .select("id", { count: "exact", head: true })
      .eq("twin_id", twin.id);
    if (!count) {
      return Response.json(
        { error: "Add some content first — there's nothing for your hiy to answer from yet." },
        { status: 409 }
      );
    }
  }

  await db.from("twins").update({ status: publish ? "live" : "draft" }).eq("id", twin.id);
  return Response.json({ status: publish ? "live" : "draft" });
}
