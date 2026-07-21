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
      <div className="w-full max-w-sm rounded-3xl border border-line bg-surface p-8 text-center shadow-[0_2px_8px_rgba(33,29,24,.05),0_24px_60px_rgba(33,29,24,.08)]">
        <div className="orb mx-auto mb-5 h-16 w-16" />
        <h1 className="font-display text-3xl">Welcome to hiy.ai</h1>
        <p className="mt-2 text-sm text-inksoft">
          Sign in to build your hiy. Free at hiy.ai/your-name.
        </p>
        <button
          onClick={google}
          className="mt-6 w-full rounded-full bg-dark px-6 py-3 text-sm font-semibold text-white transition hover:bg-accent"
        >
          Continue with Google
        </button>
        <p className="mt-4 text-[11px] text-inkfaint">
          By continuing you agree that your hiy represents you, and only you.
        </p>
      </div>
    </main>
  );
}
