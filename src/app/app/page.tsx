/** Creator dashboard: sign-in → onboard (create twin) → manage the twin. */
import { supabaseServer, supabaseAdmin } from "@/lib/supabase/server";
import SignIn from "@/components/SignIn";
import Onboard from "@/components/Onboard";
import Dashboard from "@/components/Dashboard";
import type { TwinRecord } from "@/components/dashboard/types";

export const dynamic = "force-dynamic";

export default async function AppPage() {
  const sb = await supabaseServer();
  const { data: auth } = await sb.auth.getUser();
  if (!auth.user) return <SignIn />;

  const db = supabaseAdmin();
  const { data: twin } = await db
    .from("twins")
    .select(
      "id,slug,name,role_line,bio,greeting,avatar_url,links,suggested_questions,guardrail_topics,appearance,status"
    )
    .eq("owner_id", auth.user.id)
    .maybeSingle();

  if (!twin) return <Onboard />;

  const [{ data: sources }, { data: wiki }] = await Promise.all([
    db
      .from("sources")
      .select("id,title,type,word_count,created_at")
      .eq("twin_id", twin.id)
      .order("created_at", { ascending: false }),
    db.from("wikis").select("markdown").eq("twin_id", twin.id).maybeSingle(),
  ]);

  return (
    <Dashboard
      twin={twin as TwinRecord}
      sources={sources ?? []}
      wiki={wiki?.markdown ?? null}
    />
  );
}
