/**
 * RAG engine: index a twin's sources into pgvector; retrieve; build the
 * guarded system prompt. Runs server-side with the service-role client.
 */
import { supabaseAdmin } from "@/lib/supabase/server";
import { chunkText } from "./chunk";
import { synthesizeWiki } from "./wiki";
import {
  parsePersona,
  personaPromptInput,
  PERSONA_SYSTEM,
  type PersonaProfile,
} from "./persona";
import {
  embedTexts,
  embedQuery,
  embeddingsConfigured,
  activeChatProvider,
  completeText,
} from "@/lib/llm/provider";

export { buildSystemPrompt, type RetrievedChunk } from "./prompt";
import type { RetrievedChunk } from "./prompt";

/**
 * Distill interview answers + sources into a persona profile on the twin.
 * Best-effort: returns null (and leaves the twin untouched) without an LLM
 * key or on unparseable output — chat degrades to the persona-less prompt.
 */
export async function synthesizePersona(twinId: string): Promise<PersonaProfile | null> {
  if (activeChatProvider() === "none") return null;
  const db = supabaseAdmin();
  const { data: sources } = await db
    .from("sources")
    .select("title,type,raw_text")
    .eq("twin_id", twinId)
    .order("created_at");
  if (!sources?.length) return null;

  const raw = await completeText({
    system: PERSONA_SYSTEM,
    prompt: personaPromptInput(
      sources.map((s) => ({ title: s.title, type: s.type, text: s.raw_text }))
    ),
    task: "synthesis",
    maxTokens: 1200,
  });
  const persona = parsePersona(raw);
  if (persona) await db.from("twins").update({ persona }).eq("id", twinId);
  return persona;
}

/** Rebuild a twin's wiki + chunk index from all its sources. */
export async function reindexTwin(twinId: string): Promise<number> {
  const db = supabaseAdmin();

  const { data: twinRow } = await db
    .from("twins")
    .select("is_ephemeral")
    .eq("id", twinId)
    .single();

  const { data: sources, error } = await db
    .from("sources")
    .select("title,type,raw_text")
    .eq("twin_id", twinId)
    .order("created_at");
  if (error) throw error;
  if (!sources?.length) {
    // Last source deleted: clear the derived state too.
    await db.from("chunks").delete().eq("twin_id", twinId);
    await db.from("wikis").delete().eq("twin_id", twinId);
    return 0;
  }

  // Corrections go last with an authoritative marker so the synthesizer
  // applies them over conflicting source material.
  const ordered = [
    ...sources.filter((s) => s.type !== "correction"),
    ...sources
      .filter((s) => s.type === "correction")
      .map((s) => ({ ...s, title: `[AUTHORITATIVE CORRECTION] ${s.title}` })),
  ];
  const wiki = await synthesizeWiki(
    ordered.map((s) => ({ title: s.title, type: s.type, text: s.raw_text })),
    twinRow?.is_ephemeral ? "light" : "synthesis"
  );
  await db
    .from("wikis")
    .upsert({ twin_id: twinId, markdown: wiki, updated_at: new Date().toISOString() });

  // wiki chunks (primary retrieval surface) + raw source chunks (verbatim recall)
  const chunks = chunkText(wiki, "Knowledge base");
  for (const s of sources) chunks.push(...chunkText(s.raw_text, s.title));

  let embeddings: (number[] | null)[] = chunks.map(() => null);
  if (embeddingsConfigured()) {
    embeddings = await embedTexts(chunks.map((c) => c.content));
  }

  await db.from("chunks").delete().eq("twin_id", twinId);
  const rows = chunks.map((c, i) => ({
    twin_id: twinId,
    content: c.content,
    source_title: c.sourceTitle,
    embedding: embeddings[i] ? JSON.stringify(embeddings[i]) : null,
  }));
  for (let i = 0; i < rows.length; i += 200) {
    const { error: insErr } = await db.from("chunks").insert(rows.slice(i, i + 200));
    if (insErr) throw insErr;
  }

  // Persona depends on interview/correction signal; refresh it whenever
  // that signal exists. Failure here must never fail indexing.
  if (sources.some((s) => s.type === "interview" || s.type === "correction")) {
    try {
      await synthesizePersona(twinId);
    } catch (e) {
      console.error("persona synthesis failed (non-fatal)", e);
    }
  }
  return rows.length;
}

export async function retrieve(
  twinId: string,
  query: string,
  k = 6
): Promise<RetrievedChunk[]> {
  const db = supabaseAdmin();
  if (embeddingsConfigured()) {
    const qe = await embedQuery(query);
    const { data, error } = await db.rpc("match_chunks", {
      p_twin_id: twinId,
      p_query_embedding: JSON.stringify(qe),
      p_match_count: k,
    });
    if (!error && data?.length) return data as RetrievedChunk[];
  }
  // Degraded-mode fallback (no embedding key): naive keyword rank so the
  // product still functions, visibly worse rather than dead.
  const { data } = await db
    .from("chunks")
    .select("content,source_title")
    .eq("twin_id", twinId)
    .limit(400);
  const terms = query.toLowerCase().split(/\W+/).filter((t) => t.length > 3);
  return (data ?? [])
    .map((c) => ({
      content: c.content as string,
      source_title: c.source_title as string,
      similarity:
        terms.filter((t) => (c.content as string).toLowerCase().includes(t)).length /
        Math.max(terms.length, 1),
    }))
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, k)
    .filter((c) => c.similarity > 0);
}

