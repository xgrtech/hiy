/**
 * Adaptive interview questions: what the twin's wiki *doesn't* cover.
 * Returns [] without an LLM key — the seed bank still works alone.
 */
import { NextRequest } from "next/server";
import { supabaseServer, supabaseAdmin } from "@/lib/supabase/server";
import { activeChatProvider, completeText } from "@/lib/llm/provider";
import { rateLimit, clientIp } from "@/lib/ratelimit";

export const maxDuration = 60;

const SYSTEM = `You generate interview questions for a person refining their AI twin. You are given the twin's current knowledge base (a markdown wiki). Identify the 3-5 most valuable GAPS — things a visitor would likely ask that the knowledge base cannot answer — and phrase each as one direct, personal question to the creator.

Return ONLY a JSON array of question strings. No text outside the array.`;

export async function GET(req: NextRequest) {
  if (!rateLimit(`gaps:${clientIp(req)}`, 6, 60_000)) {
    return Response.json({ error: "Too many requests." }, { status: 429 });
  }

  const sb = await supabaseServer();
  const { data: auth } = await sb.auth.getUser();
  if (!auth.user) return Response.json({ error: "Sign in first." }, { status: 401 });

  const twinId = new URL(req.url).searchParams.get("twinId") ?? "";
  if (!/^[0-9a-f-]{36}$/.test(twinId)) {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }

  const db = supabaseAdmin();
  const { data: twin } = await db
    .from("twins")
    .select("id, owner_id")
    .eq("id", twinId)
    .single();
  if (!twin || twin.owner_id !== auth.user.id) {
    return Response.json({ error: "Twin not found." }, { status: 404 });
  }

  if (activeChatProvider() === "none") return Response.json({ questions: [] });

  const { data: wiki } = await db
    .from("wikis")
    .select("markdown")
    .eq("twin_id", twinId)
    .maybeSingle();
  if (!wiki?.markdown) return Response.json({ questions: [] });

  try {
    const raw = await completeText({
      system: SYSTEM,
      prompt: wiki.markdown.slice(0, 100_000),
      task: "light",
      maxTokens: 600,
    });
    const start = raw.indexOf("[");
    const end = raw.lastIndexOf("]");
    if (start === -1 || end <= start) return Response.json({ questions: [] });
    const arr = JSON.parse(raw.slice(start, end + 1));
    const questions = Array.isArray(arr)
      ? arr.filter((q): q is string => typeof q === "string" && q.length > 0).slice(0, 5)
      : [];
    return Response.json({ questions });
  } catch (e) {
    console.error("gap questions failed (non-fatal)", e);
    return Response.json({ questions: [] });
  }
}
