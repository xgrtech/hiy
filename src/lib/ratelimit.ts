/**
 * Rate limiting in two layers:
 *  - rateLimit(): a per-instance in-memory burst gate. Cheap, synchronous,
 *    but per-serverless-instance, so it only blunts a hot instance.
 *  - rateLimitDistributed(): a Postgres-backed fixed-window limiter shared
 *    across ALL instances (via the hit_rate_limit RPC). Use it on the
 *    abuse/cost-sensitive endpoints. Falls back to the in-memory gate if the
 *    DB call fails, so a transient DB hiccup never hard-blocks traffic.
 */
import { supabaseAdmin } from "@/lib/supabase/server";

const buckets = new Map<string, { count: number; reset: number }>();

export function rateLimit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || now > b.reset) {
    buckets.set(key, { count: 1, reset: now + windowMs });
    return true;
  }
  if (b.count >= max) return false;
  b.count++;
  return true;
}

/** Cross-instance limiter. Returns true if the request is allowed. */
export async function rateLimitDistributed(
  key: string,
  max: number,
  windowMs: number
): Promise<boolean> {
  // In-memory first: rejects obvious floods without a round-trip, and is the
  // fallback if the shared store is unreachable.
  const local = rateLimit(key, max, windowMs);
  const windowStart = Math.floor(Date.now() / windowMs) * windowMs;
  try {
    const { data, error } = await supabaseAdmin().rpc("hit_rate_limit", {
      p_bucket: key,
      p_window_start: windowStart,
      p_limit: max,
    });
    if (error) return local; // store hiccup → don't hard-block on it
    return data === true;
  } catch {
    return local;
  }
}

export function clientIp(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}
