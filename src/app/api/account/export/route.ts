/**
 * GDPR-style data export: the signed-in creator downloads everything we hold
 * for them — profile, twin config, their source content, the derived wiki,
 * and every conversation their twin has had — as one JSON file.
 */
import { supabaseServer, supabaseAdmin } from "@/lib/supabase/server";
import { rateLimit, clientIp } from "@/lib/ratelimit";

export async function GET(req: Request) {
  if (!rateLimit(`export:${clientIp(req)}`, 4, 60_000)) {
    return Response.json({ error: "Too many requests — try again shortly." }, { status: 429 });
  }

  const sb = await supabaseServer();
  const { data: auth } = await sb.auth.getUser();
  if (!auth.user) return Response.json({ error: "Sign in first." }, { status: 401 });

  const db = supabaseAdmin();
  const userId = auth.user.id;

  const { data: profile } = await db
    .from("profiles")
    .select("username, display_name, tier_id, created_at")
    .eq("id", userId)
    .maybeSingle();

  const { data: twins } = await db
    .from("twins")
    .select("*")
    .eq("owner_id", userId);

  const twinIds = (twins ?? []).map((t) => t.id);

  // Pull per-twin children only for this owner's twins.
  const [sources, wikis, sessions, allowedDomains, reports] = twinIds.length
    ? await Promise.all([
        db.from("sources").select("*").in("twin_id", twinIds),
        db.from("wikis").select("twin_id, markdown, updated_at").in("twin_id", twinIds),
        db.from("chat_sessions").select("*").in("twin_id", twinIds),
        db.from("allowed_domains").select("*").in("twin_id", twinIds),
        db.from("reports").select("*").in("twin_id", twinIds),
      ])
    : [null, null, null, null, null];

  const sessionIds = (sessions?.data ?? []).map((s) => s.id);
  const { data: messages } = sessionIds.length
    ? await db.from("messages").select("*").in("session_id", sessionIds)
    : { data: [] };

  const bundle = {
    exported_at: new Date().toISOString(),
    account: { id: userId, email: auth.user.email },
    profile: profile ?? null,
    twins: twins ?? [],
    sources: sources?.data ?? [],
    wikis: wikis?.data ?? [],
    conversations: sessions?.data ?? [],
    messages: messages ?? [],
    allowed_domains: allowedDomains?.data ?? [],
    reports: reports?.data ?? [],
  };

  const filename = `hiy-export-${profile?.username ?? userId}.json`;
  return new Response(JSON.stringify(bundle, null, 2), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename="${filename}"`,
      "cache-control": "no-store",
    },
  });
}
