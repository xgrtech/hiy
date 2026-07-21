/** Shared shapes for the dashboard tabs. */

export interface TwinLink {
  label: string;
  url: string;
}

export interface TwinRecord {
  id: string;
  slug: string;
  name: string;
  role_line: string | null;
  bio: string | null;
  greeting: string | null;
  avatar_url: string | null;
  links: TwinLink[];
  suggested_questions: string[];
  guardrail_topics: string[];
  appearance: { accent?: string; theme?: "light" | "dark" } | null;
  status: string;
}

export interface SourceRecord {
  id: string;
  title: string;
  type: string;
  word_count: number;
}

export async function patchProfile(
  twinId: string,
  fields: Record<string, unknown>
): Promise<void> {
  const res = await fetch("/api/twin/profile", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ twinId, ...fields }),
  });
  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    throw new Error(j.error ?? "Couldn't save changes.");
  }
}
