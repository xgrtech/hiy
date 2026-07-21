/** Creator dashboard: sign-in → onboard (create twin) → manage knowledge. */
import { supabaseServer, supabaseAdmin } from "@/lib/supabase/server";
import SignIn from "@/components/SignIn";
import Onboard from "@/components/Onboard";
import Dashboard from "@/components/Dashboard";

export const dynamic = "force-dynamic";

export default async function AppPage() {
  const sb = await supabaseServer();
  const { data: auth } = await sb.auth.getUser();
  if (!auth.user) return <SignIn />;

  const db = supabaseAdmin();
  const { data: twin } = await db
    .from("twins")
    .select("id,slug,name,role_line,status")
    .eq("owner_id", auth.user.id)
    .maybeSingle();

  if (!twin) return <Onboard />;

  const { data: sources } = await db
    .from("sources")
    .select("id,title,type,word_count,created_at")
    .eq("twin_id", twin.id)
    .order("created_at", { ascending: false });

  return <Dashboard twin={twin} sources={sources ?? []} />;
}
