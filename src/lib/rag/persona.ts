/**
 * Persona profile: how the twin *speaks* (tone, phrases, boundaries) —
 * synthesized by LLM from interview answers + sources. Pure logic only;
 * the DB/LLM wrapper lives in engine.ts so this stays unit-testable.
 * Invariant: persona shapes style, never facts — facts stay in retrieval.
 */
import { z } from "zod";

const PersonaSchema = z.object({
  tone: z.array(z.string()).max(8),
  style_notes: z.string().max(1000),
  signature_phrases: z.array(z.string()).max(12),
  boundaries: z.array(z.string()).max(12),
  facts: z.array(z.string()).max(20),
});

export type PersonaProfile = z.infer<typeof PersonaSchema>;

/** Parse LLM output into a PersonaProfile; null on anything malformed. */
export function parsePersona(raw: string): PersonaProfile | null {
  // Tolerate code fences and prose around the object: take the outermost {...}.
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end <= start) return null;
  try {
    const parsed = PersonaSchema.safeParse(JSON.parse(raw.slice(start, end + 1)));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export const PERSONA_SYSTEM = `You are analyzing source material by and about a specific person to profile HOW THEY COMMUNICATE — not what they know.

Return ONLY a JSON object with exactly these keys:
{
  "tone": ["3-6 adjectives describing their voice"],
  "style_notes": "2-4 sentences on sentence length, formality, humor, quirks",
  "signature_phrases": ["distinctive phrases they actually use, verbatim"],
  "boundaries": ["topics they said they won't discuss (empty if none stated)"],
  "facts": ["first-person identity facts stated in interviews (empty if none)"]
}

Only include what the material supports — never invent. Interview answers are the highest-signal material. Sources titled "[AUTHORITATIVE CORRECTION]" are fixes the person made later: where they conflict with anything else (including boundaries and facts), the correction wins. No text outside the JSON object.`;

/**
 * Build the synthesis input: interviews first (highest signal), corrections
 * last with an authoritative marker (they override everything before them).
 */
export function personaPromptInput(
  sources: { title: string; type: string; text: string }[]
): string {
  const ordered = [
    ...sources.filter((s) => s.type === "interview"),
    ...sources.filter((s) => s.type !== "interview" && s.type !== "correction"),
    ...sources
      .filter((s) => s.type === "correction")
      .map((s) => ({ ...s, title: `[AUTHORITATIVE CORRECTION] ${s.title}` })),
  ];
  return ordered
    .map((s) => `### ${s.title} (${s.type})\n${s.text}`)
    .join("\n\n---\n\n")
    .slice(0, 150_000);
}

/** Validate an untrusted (e.g. DB jsonb) value into a PersonaProfile. */
export function safePersona(raw: unknown): PersonaProfile | null {
  const parsed = PersonaSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

/** Render the persona block for the system prompt ("" when absent). */
export function renderPersonaBlock(persona: PersonaProfile | null | undefined): string {
  if (!persona) return "";
  const lines = [
    "HOW YOU SPEAK (style profile from your own interview and writing — apply it to HOW you phrase answers, never as a source of facts):",
    persona.tone.length ? `- Tone: ${persona.tone.join(", ")}` : "",
    persona.style_notes ? `- Style: ${persona.style_notes}` : "",
    persona.signature_phrases.length
      ? `- Phrases you naturally use: ${persona.signature_phrases.map((p) => `"${p}"`).join(", ")}`
      : "",
    persona.facts.length ? `- About you (from your interview): ${persona.facts.join("; ")}` : "",
  ].filter(Boolean);
  return lines.join("\n");
}
