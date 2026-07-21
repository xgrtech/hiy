/** Edit YOUR twin's profile + behavior (dashboard Profile/Behavior tabs). */
import { NextRequest } from "next/server";
import { z } from "zod";
import { supabaseServer, supabaseAdmin } from "@/lib/supabase/server";
import { rateLimit, clientIp } from "@/lib/ratelimit";

const HttpUrl = z
  .string()
  .max(300)
  .refine((u) => /^https?:\/\//.test(u), "Links must start with http(s)://");

const Body = z.object({
  twinId: z.string().uuid(),
  name: z.string().min(1).max(80).optional(),
  role_line: z.string().max(120).nullable().optional(),
  bio: z.string().max(600).nullable().optional(),
  greeting: z.string().max(300).nullable().optional(),
  links: z
    .array(z.object({ label: z.string().min(1).max(40), url: HttpUrl }))
    .max(6)
    .optional(),
  suggested_questions: z.array(z.string().min(1).max(120)).max(6).optional(),
  guardrail_topics: z.array(z.string().min(1).max(120)).max(10).optional(),
  appearance: z
    .object({
      accent: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
      theme: z.enum(["light", "dark"]).optional(),
    })
    .optional(),
});

export async function PATCH(req: NextRequest) {
  if (!rateLimit(`profile:${clientIp(req)}`, 20, 60_000)) {
    return Response.json({ error: "Too many requests." }, { status: 429 });
  }

  const sb = await supabaseServer();
  const { data: auth } = await sb.auth.getUser();
  if (!auth.user) return Response.json({ error: "Sign in first." }, { status: 401 });

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request." },
      { status: 400 }
    );
  }
  const { twinId, ...fields } = parsed.data;

  const db = supabaseAdmin();
  const { data: twin } = await db
    .from("twins")
    .select("id, owner_id")
    .eq("id", twinId)
    .single();
  if (!twin || twin.owner_id !== auth.user.id) {
    return Response.json({ error: "Twin not found." }, { status: 404 });
  }

  const update = Object.fromEntries(
    Object.entries(fields).filter(([, v]) => v !== undefined)
  );
  if (Object.keys(update).length === 0) {
    return Response.json({ error: "Nothing to update." }, { status: 400 });
  }

  const { error } = await db.from("twins").update(update).eq("id", twinId);
  if (error) {
    console.error("profile update error", error);
    return Response.json({ error: "Couldn't save changes. Try again." }, { status: 500 });
  }
  return Response.json({ ok: true });
}
