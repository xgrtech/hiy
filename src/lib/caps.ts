/** Tier caps enforcement against usage_counters (no billing code yet). */
import { supabaseAdmin } from "@/lib/supabase/server";

export interface Caps {
  max_words: number;
  max_sources: number;
  monthly_messages: number;
  branding: boolean;
  inline_embed: boolean;
  bubble_embed: boolean;
  full_analytics: boolean;
}

export const EPHEMERAL_CAPS: Caps = {
  max_words: 6000,
  max_sources: 2,
  monthly_messages: 15,
  branding: true,
  inline_embed: false,
  bubble_embed: false,
  full_analytics: false,
};

export async function capsForTwin(twinId: string): Promise<Caps> {
  const db = supabaseAdmin();
  const { data: twin } = await db
    .from("twins")
    .select("is_ephemeral, owner_id")
    .eq("id", twinId)
    .single();
  if (!twin || twin.is_ephemeral || !twin.owner_id) return EPHEMERAL_CAPS;

  const { data } = await db
    .from("profiles")
    .select("tier_id, tiers(caps)")
    .eq("id", twin.owner_id)
    .single();
  const caps = (data?.tiers as { caps?: Partial<Caps> } | null)?.caps;
  return { ...EPHEMERAL_CAPS, max_words: 10000, max_sources: 5, monthly_messages: 300, ...caps };
}

function monthKey(): string {
  return new Date().toISOString().slice(0, 8) + "01";
}

export async function checkAndCountMessage(twinId: string, caps: Caps): Promise<boolean> {
  const db = supabaseAdmin();
  // Atomic check-and-increment: concurrent chats can't race past the cap
  // (the old read-then-write could double-count under load).
  const { data, error } = await db.rpc("try_increment_message_usage", {
    p_twin_id: twinId,
    p_month: monthKey(),
    p_limit: caps.monthly_messages,
  });
  if (error) {
    console.error("message usage increment failed", error);
    return false; // fail closed: don't serve unmetered on a counter error
  }
  return data === true;
}

/** Interview + correction sources count toward words but not source count. */
export const SOURCE_COUNT_EXEMPT: ReadonlySet<string> = new Set([
  "interview",
  "correction",
]);

export async function checkContentCaps(
  twinId: string,
  addingWords: number,
  caps: Caps,
  addingType?: string
): Promise<"ok" | "words" | "sources"> {
  const db = supabaseAdmin();
  const { data } = await db
    .from("sources")
    .select("word_count,type")
    .eq("twin_id", twinId);
  const sources = data ?? [];
  const counted = sources.filter((r) => !SOURCE_COUNT_EXEMPT.has(r.type)).length;
  const addsToCount = addingType ? !SOURCE_COUNT_EXEMPT.has(addingType) : true;
  if (counted + (addsToCount ? 1 : 0) > caps.max_sources) return "sources";
  const total = sources.reduce((s, r) => s + (r.word_count ?? 0), 0);
  if (total + addingWords > caps.max_words) return "words";
  return "ok";
}
