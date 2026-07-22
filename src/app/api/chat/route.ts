/** Public streaming chat with a twin (by slug). No auth — twins are public. */
import { NextRequest } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase/server";
import { retrieve } from "@/lib/rag/engine";
import { buildSystemPromptParts } from "@/lib/rag/prompt";
import { safePersona } from "@/lib/rag/persona";
import { streamChat, activeChatProvider } from "@/lib/llm/provider";
import { capsForTwin, checkAndCountMessage } from "@/lib/caps";
import { rateLimit, clientIp } from "@/lib/ratelimit";

export const maxDuration = 60;

const Body = z.object({
  slug: z.string().min(1).max(64),
  message: z.string().min(1).max(2000),
  sessionId: z.string().uuid().optional(),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().max(4000),
      })
    )
    .max(20)
    .default([]),
});

export async function POST(req: NextRequest) {
  if (!rateLimit(`chat:${clientIp(req)}`, 20, 60_000)) {
    return Response.json({ error: "Slow down a little." }, { status: 429 });
  }
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }
  const { slug, message, history, sessionId } = parsed.data;

  if (activeChatProvider() === "none") {
    return Response.json(
      { error: "Chat isn't configured yet (no LLM key on the server)." },
      { status: 503 }
    );
  }

  const db = supabaseAdmin();
  const { data: twin } = await db
    .from("twins")
    .select("id,name,role_line,guardrail_topics,persona,status,is_ephemeral,expires_at")
    .eq("slug", slug)
    .single();
  if (!twin || (twin.status !== "live" && !twin.is_ephemeral)) {
    return Response.json({ error: "Twin not found." }, { status: 404 });
  }
  if (twin.is_ephemeral && twin.expires_at && new Date(twin.expires_at) < new Date()) {
    return Response.json(
      { error: "This preview twin has expired. Sign up to make a permanent one." },
      { status: 410 }
    );
  }

  const caps = await capsForTwin(twin.id);
  if (!(await checkAndCountMessage(twin.id, caps))) {
    return Response.json(
      { error: "This twin has reached its monthly message limit." },
      { status: 429 }
    );
  }

  // persist the user message + ensure session
  let sid = sessionId ?? null;
  if (!sid) {
    const { data: s } = await db
      .from("chat_sessions")
      .insert({ twin_id: twin.id, origin_domain: req.headers.get("origin") })
      .select("id")
      .single();
    sid = s?.id ?? null;
  }
  if (sid) {
    await db.from("messages").insert({ session_id: sid, role: "user", content: message });
  }

  const chunks = await retrieve(twin.id, message, 6);
  const { core, context } = buildSystemPromptParts({
    name: twin.name,
    roleLine: twin.role_line,
    guardrailTopics: (twin.guardrail_topics as string[]) ?? [],
    chunks,
    // jsonb from the DB is untrusted: a malformed row must degrade to the
    // persona-less prompt, never 500 the public chat endpoint.
    persona: safePersona(twin.persona),
  });

  const sources = [...new Set(chunks.filter((c) => c.similarity > 0.25).map((c) => c.source_title))].slice(0, 3);

  // Split system prompt: the twin's identity/persona part is stable, so it
  // prompt-caches across turns and across concurrent visitors of this twin;
  // only the retrieved context varies per question.
  const result = streamChat({
    system: { cached: core, dynamic: context },
    messages: [...history, { role: "user" as const, content: message }],
    onFinish: async (text) => {
      if (sid) {
        await db.from("messages").insert({
          session_id: sid,
          role: "assistant",
          content: text,
          cited_sources: sources,
        });
      }
    },
  });

  const response = result.toTextStreamResponse();
  response.headers.set("x-session-id", sid ?? "");
  response.headers.set("x-cited-sources", encodeURIComponent(JSON.stringify(sources)));
  return response;
}
