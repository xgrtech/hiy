"use client";
/** Sign in / sign up: email+password or Google. Email needs no OAuth setup,
 *  so it's the zero-config path for testing and the fallback for users
 *  without Google. */
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";

export default function SignIn() {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function google() {
    const sb = supabaseBrowser();
    await sb.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback?next=/app` },
    });
  }

  async function submitEmail() {
    setError("");
    setNotice("");
    if (!email.trim() || password.length < 8) {
      setError(
        password.length < 8 && password.length > 0
          ? "Password needs at least 8 characters."
          : "Enter your email and a password (8+ characters)."
      );
      return;
    }
    setBusy(true);
    const sb = supabaseBrowser();
    try {
      if (mode === "signup") {
        const { data, error: err } = await sb.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback?next=/app`,
          },
        });
        if (err) throw err;
        if (data.session) {
          // Email confirmation disabled — signed in immediately.
          router.refresh();
        } else {
          setNotice("Check your inbox — we sent a confirmation link to finish signing up.");
        }
      } else {
        const { error: err } = await sb.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (err) throw err;
        router.refresh();
      }
    } catch (e) {
      const msg = (e as Error).message ?? "Something went wrong.";
      setError(
        /invalid login credentials/i.test(msg)
          ? "Wrong email or password — or sign up first."
          : msg
      );
    } finally {
      setBusy(false);
    }
  }

  const inputCls =
    "w-full rounded-xl border border-line bg-paper px-4 py-2.5 text-sm outline-none focus:border-accent";

  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-sm rounded-3xl border border-line bg-surface p-8 text-center shadow-[0_2px_8px_rgba(33,29,24,.05),0_24px_60px_rgba(33,29,24,.08)]">
        <div className="orb mx-auto mb-5 h-16 w-16" />
        <h1 className="font-display text-3xl">
          {mode === "signin" ? "Welcome back" : "Create your hiy"}
        </h1>
        <p className="mt-2 text-sm text-inksoft">
          {mode === "signin"
            ? "Sign in to manage your hiy."
            : "Free at hiy.ai/your-name — no card needed."}
        </p>

        <div className="mt-6 space-y-2.5 text-left">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            className={inputCls}
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submitEmail()}
            placeholder={mode === "signup" ? "Choose a password (8+ characters)" : "Password"}
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
            className={inputCls}
          />
        </div>

        {error && <p className="mt-3 text-left text-xs text-accent">{error}</p>}
        {notice && <p className="mt-3 text-left text-xs text-green">{notice}</p>}

        <button
          onClick={submitEmail}
          disabled={busy}
          className="btn-warm mt-4 w-full px-6 py-3 text-sm disabled:opacity-50"
        >
          {busy ? "One moment…" : mode === "signin" ? "Sign in" : "Create account"}
        </button>

        <div className="my-4 flex items-center gap-3 text-[11px] text-inkfaint">
          <span className="h-px flex-1 bg-line" />
          or
          <span className="h-px flex-1 bg-line" />
        </div>

        <button
          onClick={google}
          className="w-full rounded-full bg-dark px-6 py-3 text-sm font-semibold text-white transition hover:bg-accent"
        >
          Continue with Google
        </button>

        <p className="mt-5 text-xs text-inksoft">
          {mode === "signin" ? (
            <>
              New here?{" "}
              <button
                onClick={() => {
                  setMode("signup");
                  setError("");
                  setNotice("");
                }}
                className="font-semibold text-accent underline"
              >
                Create an account
              </button>
            </>
          ) : (
            <>
              Already have a hiy?{" "}
              <button
                onClick={() => {
                  setMode("signin");
                  setError("");
                  setNotice("");
                }}
                className="font-semibold text-accent underline"
              >
                Sign in
              </button>
            </>
          )}
        </p>
        <p className="mt-3 text-[11px] text-inkfaint">
          By continuing you agree that your hiy represents you, and only you.
        </p>
      </div>
    </main>
  );
}
