import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  // Only allow same-origin paths: must start with a single "/" (blocks
  // "https://…", "//host" and "/\host" open-redirect forms).
  const nextParam = url.searchParams.get("next") ?? "/app";
  const next = /^\/(?![/\\])/.test(nextParam) ? nextParam : "/app";

  if (code) {
    const res = NextResponse.redirect(new URL(next, url.origin));
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => req.cookies.getAll(),
          setAll: (all) =>
            all.forEach(({ name, value, options }) => res.cookies.set(name, value, options)),
        },
      }
    );
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return res;
  }
  return NextResponse.redirect(new URL("/?auth_error=1", url.origin));
}
