"use client";
import { supabaseBrowser } from "@/lib/supabase/client";

export default function SignIn() {
  async function google() {
    const sb = supabaseBrowser();
    await sb.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback?next=/app` },
    });
  }
  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="arch arch-shadow w-full max-w-sm overflow-hidden border border-line bg-surface text-center">
        <div className="bg-[radial-gradient(120%_100%_at_50%_0%,#e4ede9_0%,transparent_70%)] px-8 pb-2 pt-14">
          <div className="orb mx-auto mb-5 h-20 w-20" />
        </div>
        <div className="px-8 pb-9">
        <h1 className="font-display text-2xl font-medium">Welcome to hiy.ai</h1>
        <p className="mt-2 text-sm text-inksoft">
          Sign in to build your twin. Free at hiy.ai/your-name.
        </p>
        <button
          onClick={google}
          className="mt-6 w-full rounded-full bg-ink px-6 py-3 text-sm font-semibold text-paper transition hover:bg-accent"
        >
          Continue with Google
        </button>
        <p className="mt-4 text-[11px] text-inkfaint">
          By continuing you agree that your twin represents you, and only you.
        </p>
        </div>
      </div>
    </main>
  );
}
