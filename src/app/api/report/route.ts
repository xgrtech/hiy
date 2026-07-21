/** Impersonation / abuse reports (public, rate-limited, service-role write). */
import { NextRequest } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase/server";
import { rateLimit, clientIp } from "@/lib/ratelimit";

const Body = z.object({
  slug: z.string().min(1).max(64),
  reason: z.string().min(10).max(2000),
  contact: z.string().max(200).optional(),
});

export async function POST(req: NextRequest) {
  if (!rateLimit(`report:${clientIp(req)}`, 5, 60 * 60_000)) {
    return Response.json({ error: "Too many reports from this address." }, { status: 429 });
  }
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid report." }, { status: 400 });

  const db = supabaseAdmin();
  const { data: twin } = await db
    .from("twins")
    .select("id")
    .eq("slug", parsed.data.slug)
    .single();
  if (!twin) return Response.json({ error: "Twin not found." }, { status: 404 });

  await db.from("reports").insert({
    twin_id: twin.id,
    reason: parsed.data.reason,
    reporter_contact: parsed.data.contact ?? null,
  });
  return Response.json({ ok: true });
}
