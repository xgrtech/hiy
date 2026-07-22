/** Karpathy-style wiki synthesis: raw sources → one structured markdown doc. */
import { activeChatProvider, completeText, type LlmTask } from "@/lib/llm/provider";

const SYSTEM = `You are building a structured personal knowledge base ("wiki") about a specific person from raw source material they provided about themselves (blog posts, video transcripts, résumé text, notes).

Rewrite and organize it into clean markdown with topic headings adapted to the material (e.g. Background, Work, Projects, Opinions & Takes, How They Talk, Stories & Anecdotes). Preserve first-person facts, specific details, anecdotes, and distinctive phrases/opinions verbatim where possible — these make the eventual twin sound like the real person. Never invent facts not supported by the sources. No editorializing.

Sources titled "[AUTHORITATIVE CORRECTION]" are fixes the person made to their own knowledge base: where they conflict with other material, the correction wins — apply it and drop the outdated claim.`;

export async function synthesizeWiki(
  sources: { title: string; type: string; text: string }[],
  // Ephemeral preview twins get the light model: they last 24h and exist to
  // demo the product, not to be the product.
  task: LlmTask = "synthesis"
): Promise<string> {
  const combined = sources
    .map((s) => `### Source: ${s.title} (${s.type})\n${s.text}`)
    .join("\n\n---\n\n")
    // stay within a sane context budget; caps limit real corpus size anyway
    .slice(0, 400_000);

  if (activeChatProvider() === "none") {
    // Keys not wired yet: structure without synthesis so indexing still works.
    return sources.map((s) => `## ${s.title}\n\n${s.text}`).join("\n\n");
  }
  return completeText({
    system: SYSTEM,
    prompt: `Raw source material:\n\n${combined}\n\nProduce the structured markdown wiki now.`,
    task,
    maxTokens: 4000,
  });
}
