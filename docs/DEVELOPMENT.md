# Developer guide

How the system works, how to extend it, and what's honestly verified vs not.

## Architecture in one paragraph

Everything is one Next.js app. Public twin pages and the dashboard are
server components reading through Supabase; mutations and chat go through
API route handlers. The RAG engine runs server-side with the service-role
client: on every source added, ALL of a twin's sources are re-synthesized
into a "wiki" (one clean markdown doc), the wiki + raw sources are chunked
(~180 words, 30 overlap, paragraph-respecting), embedded (OpenAI 1536-dim),
and stored in `chunks` (pgvector, HNSW index). Chat retrieves top-k via the
`match_chunks` RPC (service-role only), builds a guarded persona prompt,
and streams tokens from Anthropic (or OpenAI) back to the browser, logging
both sides of the conversation and decrementing the monthly message cap.

## Key flows

### Ingest (authed): `POST /api/ingest`
UI (Dashboard.tsx, 5 tabs) → route validates auth + ownership → dispatcher
`src/lib/ingest/index.ts` → adapter → caps check → insert `sources` row →
`reindexTwin()` (wiki → chunks → embeddings) → twin status `live`.
Errors are typed (`IngestError`) with user-facing copy; the YouTube adapter
throws `yt_blocked` when fetch fails, which flips the UI into the
paste-transcript mode — that fallback is a designed first-class flow.

### Chat (public): `POST /api/chat`
Rate limit (per-IP burst) → twin lookup by slug (must be `live` or an
unexpired ephemeral) → monthly cap check via `usage_counters` → retrieve →
`buildSystemPrompt` (disclosure, no-invention, prompt-injection resistance,
per-twin guardrail topics) → `streamText` → plain text stream; cited source
titles and the session id ride on response headers (`x-cited-sources`,
`x-session-id`).

### Instant twin (public, the conversion wow): `POST /api/instant`
3 per IP per hour → ingest one source → cap at 6k words → create ephemeral
twin (`is_ephemeral`, `expires_at` = +24h, slug `preview-xxxxxxxx`) → index
→ redirect to `/preview-…`. Expired previews render a sign-up prompt.
**TODO:** a cleanup job for expired ephemeral rows (see Roadmap).

## The ingestion library (`src/lib/ingest/`) — the hardened part

- `net.ts` — `safeFetch`: SSRF guard (scheme allowlist; DNS-resolves and
  rejects private/reserved IPs BEFORE fetching; redirects followed manually
  with the check re-run per hop; IPv6 brackets normalized — a test caught
  that bypass), 15s timeout, 5MB streaming size cap, 2 retries w/ jitter.
- `blog.ts` — Mozilla Readability primary, density-heuristic fallback,
  charset sniffing (header + meta) so non-UTF-8 pages don't mojibake.
- `youtube.ts` — youtubei.js with hard timeouts; honest failure modes
  (`yt_no_transcript` vs `yt_blocked`); `ingestYoutubePaste` strips the
  timestamp lines from YouTube's "Show transcript" panel copy.
- `files.ts` — unpdf (serverless-safe PDF), mammoth (DOCX), plain text/MD
  with binary sniffing; scanned-PDF detection → honest `file_empty` error.
- `errors.ts` — every failure has a stable `code`, user-facing copy, and a
  `retryable` flag. Add new error kinds here first.

Run the suite after touching any of it: `npx tsx tests/ingest.test.ts`.

## Extending

**New ingestion source** (e.g. podcast RSS): create `src/lib/ingest/rss.ts`
returning `IngestedSource`, register in the dispatcher switch, add the type
to the DB check constraint (`sources.type`) via a new migration, add a tab
in `Dashboard.tsx`, add fixture tests.

**Tiers/caps**: rows in `tiers` (caps JSON) — `src/lib/caps.ts` reads them.
Changing free-tier limits is a SQL update, no deploy. Stripe (deferred)
bolts on by mapping subscription state → `profiles.tier_id`; the
entitlement checks are already everywhere they need to be.

**Guardrails per twin**: `twins.guardrail_topics` (string array) is already
injected into the system prompt; there's no dashboard editor for it yet.

**Design tokens**: all in `src/app/globals.css` (`:root` + `@theme`).
The orb, doodles, springs, blobs, and reveals are utility classes
(`.orb`, `.doodle-path`, `.bubble-in`, `.blob`, `.reveal`) — reduced-motion
is respected globally.

## Honest status: verified vs not

**Verified:** ingestion suite (29/29) · full TS build (12 routes) · schema
applied to live project + security advisors clean.

**Built but NOT runtime-verified yet** (blocked on keys/OAuth config at the
time of writing): end-to-end DB flows (needs `SUPABASE_SERVICE_ROLE_KEY`),
streaming chat + wiki synthesis (needs an LLM key), Google sign-in (needs
provider enabled), live blog/YouTube fetching (this codebase was built in a
sandbox with blocked egress — the code is fixture-tested; test live after
setup). Work through docs/SETUP.md §6 as the acceptance checklist.

## Known gaps / deliberate deferrals

- No cron cleanup of expired ephemeral twins yet (rows persist harmlessly;
  add a Vercel cron or Supabase pg_cron job).
- Rate limiting is per-serverless-instance (best effort). Add Upstash Redis
  for real distributed limits before any traffic spike.
- `allowed_domains` table exists but isn't enforced on /embed yet.
- Bubble embed (paid tier), share card/QR, analytics UI, appearance editor,
  suggested-questions editor, wiki viewer/editor: schema-ready, UI pending.
- Voice (ElevenLabs) and Stripe: deferred by explicit product decision.
- Headline/copy on the landing page is v1 — revisit before launch.

## Roadmap (suggested order)

1. Wire keys, run the SETUP.md checklist, fix anything it surfaces
2. Deploy to Vercel + domain (docs/DEPLOY.md)
3. Ephemeral-twin cleanup job + Upstash rate limiting
4. Dashboard: suggested questions, guardrail topics, appearance, wiki view
5. Analytics (top questions, knowledge gaps) — the retention feature
6. Share card (OG image) + QR
7. Bubble embed + allowed-domain enforcement (paid-tier surface)
8. Stripe + tier upgrades
9. Auto-sync (re-crawl blog/YouTube on a schedule) — the differentiator
10. Voice replies (ElevenLabs)
