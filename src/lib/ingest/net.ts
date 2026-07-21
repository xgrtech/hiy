/**
 * safeFetch — the hardened HTTP layer every URL-based ingester sits on.
 *
 * Threat model: the URL comes from an untrusted user on a public endpoint
 * (including the no-auth "instant twin" flow), and this code runs inside
 * our infrastructure. That makes SSRF the #1 concern: a crafted URL must
 * not let a user make our server talk to internal services (cloud metadata
 * endpoints, private databases, localhost admin panels).
 *
 * Protections:
 *  - scheme allowlist (http/https only)
 *  - DNS resolution + private/reserved IP rejection BEFORE fetching,
 *    re-checked on every redirect hop (redirects are followed manually)
 *  - hard timeout via AbortController
 *  - response size cap enforced while streaming (not after)
 *  - bounded retries with jitter for transient failures only
 */
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { INGEST_ERRORS } from "./errors";

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB is generous for any article page
const TIMEOUT_MS = 15_000;
const MAX_REDIRECTS = 5;
const RETRIES = 2;

const USER_AGENT =
  "Mozilla/5.0 (compatible; HiyBot/1.0; +https://hiy.ai/bot)";

/** Reject IPs in private, loopback, link-local, and reserved ranges. */
function isPrivateIp(ip: string): boolean {
  if (ip.includes(":")) {
    // IPv6: loopback, unspecified, link-local, unique-local, v4-mapped
    const lower = ip.toLowerCase();
    if (lower === "::1" || lower === "::") return true;
    if (lower.startsWith("fe80:") || lower.startsWith("fc") || lower.startsWith("fd"))
      return true;
    if (lower.startsWith("::ffff:")) return isPrivateIp(lower.slice(7));
    return false;
  }
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n))) return true;
  const [a, b] = parts;
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) || // CGNAT
    (a === 169 && b === 254) || // link-local / cloud metadata (169.254.169.254)
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19)) ||
    a >= 224 // multicast + reserved
  );
}

async function assertPublicHost(url: URL): Promise<void> {
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw INGEST_ERRORS.blockedUrl();
  }
  // URL.hostname keeps brackets around IPv6 literals ("[::1]") — strip
  // them or isIP() misclassifies and the literal slips past to DNS lookup.
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (isIP(host)) {
    if (isPrivateIp(host)) throw INGEST_ERRORS.blockedUrl();
    return;
  }
  if (host === "localhost" || host.endsWith(".local") || host.endsWith(".internal")) {
    throw INGEST_ERRORS.blockedUrl();
  }
  let addrs;
  try {
    addrs = await lookup(host, { all: true });
  } catch {
    throw INGEST_ERRORS.fetchFailed();
  }
  if (addrs.length === 0 || addrs.some((a) => isPrivateIp(a.address))) {
    throw INGEST_ERRORS.blockedUrl();
  }
}

async function readBodyCapped(res: Response): Promise<Buffer> {
  const reader = res.body?.getReader();
  if (!reader) return Buffer.alloc(0);
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_BYTES) {
      await reader.cancel();
      throw INGEST_ERRORS.tooLarge();
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks);
}

export interface SafeFetchResult {
  finalUrl: string;
  contentType: string;
  body: Buffer;
}

async function fetchOnce(rawUrl: string): Promise<SafeFetchResult> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw INGEST_ERRORS.invalidUrl();
  }

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    await assertPublicHost(url);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    let res: Response;
    try {
      res = await fetch(url.toString(), {
        redirect: "manual",
        signal: controller.signal,
        headers: {
          "user-agent": USER_AGENT,
          accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.5",
          "accept-language": "en;q=0.9,*;q=0.5",
        },
      });
    } catch (e) {
      clearTimeout(timer);
      if ((e as Error).name === "AbortError") throw INGEST_ERRORS.fetchTimeout();
      throw INGEST_ERRORS.fetchFailed();
    }
    clearTimeout(timer);

    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get("location");
      res.body?.cancel();
      if (!loc || hop === MAX_REDIRECTS) throw INGEST_ERRORS.fetchFailed(res.status);
      url = new URL(loc, url); // relative redirects resolved against current
      continue;
    }
    if (!res.ok) {
      res.body?.cancel();
      throw INGEST_ERRORS.fetchFailed(res.status);
    }

    const len = Number(res.headers.get("content-length") ?? 0);
    if (len > MAX_BYTES) {
      res.body?.cancel();
      throw INGEST_ERRORS.tooLarge();
    }

    const body = await readBodyCapped(res);
    return {
      finalUrl: url.toString(),
      contentType: (res.headers.get("content-type") ?? "").toLowerCase(),
      body,
    };
  }
  throw INGEST_ERRORS.fetchFailed();
}

/** Fetch with bounded retries on transient failures (timeouts, 5xx, network). */
export async function safeFetch(rawUrl: string): Promise<SafeFetchResult> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= RETRIES; attempt++) {
    try {
      return await fetchOnce(rawUrl);
    } catch (e) {
      lastErr = e;
      const retryable =
        e instanceof Error && "retryable" in e && (e as { retryable: boolean }).retryable;
      if (!retryable || attempt === RETRIES) throw e;
      // 400–900ms jittered backoff — enough to ride out a blip, short
      // enough that the creator watching the progress bar doesn't suffer.
      await new Promise((r) => setTimeout(r, 400 + Math.random() * 250 + attempt * 250));
    }
  }
  throw lastErr;
}
