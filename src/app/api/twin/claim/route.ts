/**
 * Claim an anonymous preview twin into the signed-in user's account —
 * atomically, preserving its sources and already-built index. This closes
 * the conversion leak where signing up created a *fresh* twin and silently
 * dropped the preview the visitor just made.
 */
import { NextRequest } from "next/server";
import { z } from "zod";
import { supabaseServer, supabaseAdmin } from "@/lib/supabase/server";

const Body = z.object({
  previewSlug: z.string().min(1).max(64),
  username: z
    .string()
    .regex(/^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$/, "3–30 chars, lowercase letters, numbers, hyphens"),
  name: z.string().min(1).max(80).optional(),
  identityConfirmed: z.literal(true, {
    error: "You must confirm this twin represents you (or someone who gave you documented permission).",
  }),
});

export async function POST(req: NextRequest) {
  const sb = await supabaseServer();
  const { data: auth } = await sb.auth.getUser();
  if (!auth.user) return Response.json({ error: "Sign in first." }, { status: 401 });

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message ?? "Invalid request." }, { status: 400 });
  }
  const { previewSlug, username, name } = parsed.data;
  const db = supabaseAdmin();

  // one twin per account (also guarded by a DB unique index)
  const { data: existing } = await db
    .from("twins")
    .select("id")
    .eq("owner_id", auth.user.id)
    .maybeSingle();
  if (existing) {
    return Response.json({ error: "You already have a twin — one per account for now." }, { status: 409 });
  }

  const { data: reserved } = await db
    .from("reserved_usernames")
    .select("username")
    .eq("username", username)
    .maybeSingle();
  if (reserved) return Response.json({ error: "That username isn't available." }, { status: 409 });

  // the preview must still be an unclaimed, unexpired ephemeral twin
  const { data: preview } = await db
    .from("twins")
    .select("id, is_ephemeral, owner_id, expires_at")
    .eq("slug", previewSlug)
    .maybeSingle();
  if (!preview || !preview.is_ephemeral || preview.owner_id) {
    return Response.json({ error: "That preview can't be claimed — make a fresh one." }, { status: 404 });
  }
  if (preview.expires_at && new Date(preview.expires_at) < new Date()) {
    return Response.json({ error: "This preview has expired — make a new one." }, { status: 410 });
  }

  // claim the username on the profile (unique)
  const { error: profileErr } = await db
    .from("profiles")
    .upsert({ id: auth.user.id, username, display_name: name ?? undefined });
  if (profileErr) {
    return Response.json({ error: "That username is taken." }, { status: 409 });
  }

  // Atomic transfer: the WHERE guards (still ephemeral, still unowned) make a
  // concurrent double-claim a no-op for the loser.
  const update: Record<string, unknown> = {
    owner_id: auth.user.id,
    slug: username,
    is_ephemeral: false,
    expires_at: null,
    identity_confirmed_at: new Date().toISOString(),
    status: "live", // it already has content and was chatted with
  };
  if (name) update.name = name;

  const { data: claimed, error } = await db
    .from("twins")
    .update(update)
    .eq("id", preview.id)
    .eq("is_ephemeral", true)
    .is("owner_id", null)
    .select("slug")
    .maybeSingle();

  if (error) {
    // most likely the username collided with an existing twin slug
    return Response.json({ error: "That URL is taken — try another." }, { status: 409 });
  }
  if (!claimed) {
    return Response.json({ error: "That preview was already claimed." }, { status: 409 });
  }

  return Response.json({ twin: { slug: claimed.slug } });
}
