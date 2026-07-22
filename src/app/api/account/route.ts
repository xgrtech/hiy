/**
 * Delete the whole account. Removing the auth user cascades through
 * profiles → twins → sources/chunks/wikis/conversations/analytics, so
 * nothing of the user is left behind. Irreversible.
 */
import { supabaseServer, supabaseAdmin } from "@/lib/supabase/server";

export async function DELETE() {
  const sb = await supabaseServer();
  const { data: auth } = await sb.auth.getUser();
  if (!auth.user) return Response.json({ error: "Sign in first." }, { status: 401 });

  const admin = supabaseAdmin();
  const { error } = await admin.auth.admin.deleteUser(auth.user.id);
  if (error) {
    console.error("account delete error", error);
    return Response.json({ error: "Couldn't delete your account." }, { status: 500 });
  }
  // Best-effort: clear the session cookie so the client lands logged out.
  await sb.auth.signOut().catch(() => {});
  return Response.json({ ok: true });
}
