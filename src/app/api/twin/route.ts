/** Create/update the creator's (single) twin. Enforces reserved usernames
 * and the identity confirmation required by the impersonation policy. */
import { NextRequest } from "next/server";
import { z } from "zod";
import { supabaseServer, supabaseAdmin } from "@/lib/supabase/server";

const CreateBody = z.object({
  username: z
    .string()
    .regex(/^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$/, "3–30 chars, lowercase letters, numbers, hyphens"),
  name: z.string().min(1).max(80),
  roleLine: z.string().max(120).optional(),
  identityConfirmed: z.literal(true, {
    error: "You must confirm this twin represents you (or someone who gave you documented permission).",
  }),
});

export async function POST(req: NextRequest) {
  const sb = await supabaseServer();
  const { data: auth } = await sb.auth.getUser();
  if (!auth.user) return Response.json({ error: "Sign in first." }, { status: 401 });

  const parsed = CreateBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request." },
      { status: 400 }
    );
  }
  const { username, name, roleLine } = parsed.data;

  const db = supabaseAdmin();

  const { data: reserved } = await db
    .from("reserved_usernames")
    .select("username")
    .eq("username", username)
    .maybeSingle();
  if (reserved) return Response.json({ error: "That username isn't available." }, { status: 409 });

  const { data: existingTwin } = await db
    .from("twins")
    .select("id")
    .eq("owner_id", auth.user.id)
    .maybeSingle();
  if (existingTwin) {
    return Response.json({ error: "You already have a twin — one per account for now." }, { status: 409 });
  }

  // profile upsert with username uniqueness
  const { error: profileErr } = await db.from("profiles").upsert({
    id: auth.user.id,
    username,
    display_name: name,
  });
  if (profileErr) {
    return Response.json({ error: "That username is taken." }, { status: 409 });
  }

  const { data: twin, error } = await db
    .from("twins")
    .insert({
      owner_id: auth.user.id,
      slug: username,
      name,
      role_line: roleLine ?? null,
      status: "draft",
      identity_confirmed_at: new Date().toISOString(),
    })
    .select("id, slug")
    .single();
  if (error) return Response.json({ error: "That URL is taken." }, { status: 409 });

  return Response.json({ twin });
}
