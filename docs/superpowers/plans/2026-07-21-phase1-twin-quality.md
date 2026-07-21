# Phase 1: Twin Quality Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Delphi-parity twin quality: personality interview + persona synthesis, bulk ingestion (sitemap/RSS/YouTube channel), public-page redesign, and a 5-tab creator dashboard — per the approved spec `docs/superpowers/specs/2026-07-21-phase1-twin-quality-design.md`.

**Architecture:** Everything a creator teaches the twin (interview answers, corrections, bulk imports) is a `sources` row flowing through the existing pipeline (wiki synthesis → chunking → embedding → retrieval). Persona is a jsonb profile on `twins`, synthesized by LLM, injected into the system prompt as a style block. Bulk import is client-driven: `/api/discover` lists items, client calls `/api/ingest` per item with `skipReindex`, then one final `/api/twin/reindex`.

**Tech Stack:** Next.js 16 App Router (params are Promises; route handlers return `Response.json`), Supabase (service-role via `supabaseAdmin()`, user-auth via `supabaseServer()`), Vercel AI SDK via `src/lib/llm/provider.ts`, zod v4, Tailwind v4 tokens in `globals.css`, tests via `npx tsx tests/*.test.ts` (fixture-driven, no framework).

## Global Constraints

- Positioning invariant: persona shapes *style*, never invents *facts*; citations + "I don't know" behavior unchanged.
- All user-triggered failures use the typed `IngestError` pattern (stable `code`, `userMessage`, `retryable`).
- Caps are authoritative server-side in `/api/ingest` (`checkContentCaps`); interview + correction sources count toward `max_words` but NOT `max_sources`.
- All external fetching goes through `safeFetch` in `src/lib/ingest/net.ts` (SSRF guard).
- LLM-dependent code must degrade when `activeChatProvider() === "none"` (return fallback, never throw at import time).
- Repo conventions: `@/` import alias, JSDoc header comment per file, design tokens/utility classes from `globals.css` (`.orb`, `.blob`, `.bubble-in`, `border-line bg-surface` cards, `text-inksoft/inkfaint`, `bg-accent`).
- Commit per task with conventional-commit messages; run `npx tsx tests/ingest.test.ts` and `npm run build` before each commit.

---

### Task 1: Migration + shared types

**Files:**
- Create: `supabase/migrations/20260721170000_phase1_twin_quality.sql`
- Modify: `src/lib/ingest/types.ts`

**Interfaces:**
- Produces: DB columns `twins.persona jsonb`, `twins.avatar_url text`, `twins.links jsonb default '[]'`; `sources.type` accepts `'interview'`/`'correction'`; public-read `avatars` storage bucket. TS `SourceType` union includes `"interview" | "correction"`.

- [ ] **Step 1: Write the migration**

```sql
-- Phase 1 (twin quality): persona + profile fields, interview/correction
-- source types, avatars storage bucket.
alter table public.sources drop constraint sources_type_check;
alter table public.sources add constraint sources_type_check
  check (type in ('manual','linkedin','blog','youtube','file','interview','correction'));

alter table public.twins add column persona jsonb;
alter table public.twins add column avatar_url text;
alter table public.twins add column links jsonb not null default '[]'::jsonb;

insert into storage.buckets (id, name, public) values ('avatars','avatars', true)
on conflict (id) do nothing;

create policy "avatars are publicly readable"
  on storage.objects for select using (bucket_id = 'avatars');
-- writes go through the service role only (authed API route) — no insert policy.
```

- [ ] **Step 2: Apply to live project** via Supabase MCP `apply_migration` (project `pbkdokxafuoiagvjeigm`, name `phase1_twin_quality`), then run `get_advisors(security)` and confirm no new ERROR-level lints.

- [ ] **Step 3: Extend `SourceType`** in `src/lib/ingest/types.ts`:

```ts
export type SourceType =
  | "manual" | "linkedin" | "blog" | "youtube" | "file"
  | "interview" | "correction";
```

- [ ] **Step 4: Verify** `npm run build` passes; commit `feat: phase1 schema — persona, profile fields, interview/correction types`.

---

### Task 2: Persona synthesis + prompt plumbing

**Files:**
- Create: `src/lib/rag/persona.ts`, `tests/persona.test.ts`
- Modify: `src/lib/rag/engine.ts` (buildSystemPrompt + reindexTwin), `src/lib/rag/wiki.ts` (corrections authoritative), `src/app/api/chat/route.ts` (select + pass persona)

**Interfaces:**
- Produces:
  - `interface PersonaProfile { tone: string[]; style_notes: string; signature_phrases: string[]; boundaries: string[]; facts: string[] }`
  - `parsePersona(raw: string): PersonaProfile | null` (pure; zod-validates LLM JSON, tolerates fences)
  - `personaPromptInput(sources: {title: string; type: string; text: string}[]): string` (pure)
  - `synthesizePersona(twinId: string): Promise<PersonaProfile | null>` (returns null when provider "none"; writes `twins.persona`)
  - `buildSystemPrompt(opts)` gains optional `persona?: PersonaProfile | null` → renders a "HOW YOU SPEAK" block between the rules and CONTEXT; boundaries merge with guardrail topics.
  - `reindexTwin` orders sources: corrections LAST with `[AUTHORITATIVE CORRECTION]` title prefix into `synthesizeWiki`, whose SYSTEM prompt states corrections override conflicting source material; after indexing, calls `synthesizePersona` when any `interview`/`correction` source exists.

- [ ] **Step 1: Write failing tests** in `tests/persona.test.ts` (same harness style as `tests/ingest.test.ts` — a `t(name, fn)` runner with assertions):

```ts
// parsePersona: valid JSON (with/without ```json fences) → profile; junk → null;
// missing keys → null. buildSystemPrompt with persona → contains "HOW YOU SPEAK",
// tone terms, boundaries merged into refusal line; without persona → unchanged
// baseline (no "HOW YOU SPEAK"). personaPromptInput puts interview sources first
// and includes qa text.
```

- [ ] **Step 2: Run** `npx tsx tests/persona.test.ts` → FAIL (module not found).
- [ ] **Step 3: Implement** `persona.ts` (zod schema for PersonaProfile; `synthesizePersona` reads sources, calls `completeText` with a JSON-only system prompt, `parsePersona`, upserts `twins.persona`) and the `engine.ts`/`wiki.ts`/chat-route changes.
- [ ] **Step 4: Run tests** → PASS; `npm run build` → PASS.
- [ ] **Step 5: Commit** `feat: persona synthesis + prompt injection, corrections authoritative`.

---

### Task 3: skipReindex + reindex endpoint + caps exemption

**Files:**
- Modify: `src/app/api/ingest/route.ts` (zod: `skipReindex: z.boolean().optional()`, sourceType enum + `"correction"`; skip status flip + reindex when set), `src/lib/ingest/index.ts` (dispatcher case `"correction"` → `ingestManual(payload, title ?? "Correction", "correction")` — reuse via widened type param), `src/lib/caps.ts` (`checkContentCaps` counts only non-interview/correction rows toward `max_sources`)
- Create: `src/app/api/twin/reindex/route.ts` (POST `{twinId}` → auth + ownership → status indexing → `reindexTwin` → live)
- Modify: `tests/ingest.test.ts` (dispatcher routes `correction`; min-words rule applies)

**Interfaces:**
- Produces: `POST /api/ingest` body accepts `sourceType: "correction"` and `skipReindex?: boolean` (response unchanged: `{source, numChunks}` — `numChunks: 0` when skipped). `POST /api/twin/reindex` → `{numChunks}`. `checkContentCaps(twinId, addingWords, caps, sourceType)` signature gains the type param.

- [ ] Steps: failing test → implement → tests + build PASS → commit `feat: correction sources, skipReindex batch flag, reindex endpoint`.

---

### Task 4: Interview (lib + API + Refine tab)

**Files:**
- Create: `src/lib/interview/questions.ts` (SEED_QUESTIONS: 18 questions, 5 groups: voice, opinions, faqs, boundaries, bio), `src/lib/interview/format.ts` (`qaToTranscript(qa: {q: string; a: string}[]): string`; `qaBoundaries(qa): string[]` extracting boundary-group answers), `src/app/api/interview/route.ts` (POST), `src/app/api/interview/gaps/route.ts` (GET), `src/components/InterviewFlow.tsx`
- Modify: `tests/persona.test.ts` (format tests)

**Interfaces:**
- Produces: `POST /api/interview` `{twinId, qa: [{q,a}]}` (auth, ownership, ≥3 answered) → inserts `sources` row `type:'interview'`, `title:'Personality interview'`, `raw_text: qaToTranscript(qa)`, `meta: {qa}` → merges `qaBoundaries` into `twins.guardrail_topics` → reindex + persona → `{sourceId, numChunks}`. `GET /api/interview/gaps?twinId=` → `{questions: string[]}` (LLM from wiki; `[]` if provider none). `InterviewFlow` props `{twinId: string, onDone: () => void}` — one question at a time, skip, localStorage key `hiy-interview-${twinId}`, submit on finish.

- [ ] Steps: failing format tests → implement lib → API routes → UI component → tests + build PASS → commit `feat: personality interview with adaptive gap questions`.

---

### Task 5: Twin profile/behavior API + avatar upload

**Files:**
- Create: `src/app/api/twin/profile/route.ts` (PATCH), `src/app/api/twin/avatar/route.ts` (POST multipart)
- Test: extend `tests/persona.test.ts` with pure-helper tests if any extracted

**Interfaces:**
- Produces: `PATCH /api/twin/profile` `{twinId, name?, role_line?, bio?, greeting?, links?: {label,url}[] (≤6, http(s) only), suggested_questions?: string[] (≤6, ≤120 chars), guardrail_topics?: string[] (≤10), appearance?: {accent?: string (hex), theme?: "light"|"dark"}}` — zod-validated, auth + ownership, updates `twins`. `POST /api/twin/avatar` multipart `{twinId, file}` — image sniff (magic bytes jpeg/png/webp), ≤2MB, upload to `avatars/{twinId}.{ext}` via service client, sets `twins.avatar_url` to public URL.

- [ ] Steps: implement both routes (zod schemas exactly as above) → build PASS → commit `feat: twin profile/behavior editing + avatar upload`.

---

### Task 6: Public page redesign + citations panel + ?q= deep link

**Files:**
- Modify: `src/app/[slug]/page.tsx` (avatar img fallback to orb, bio, links row, `searchParams` Promise → `q` passed to chat), `src/components/TwinChat.tsx` (props gain `greeting?: string | null`, `initialQuestion?: string` (auto-send once), `avatarUrl?: string | null`; assistant bubbles get collapsible "Sources" panel listing cited titles; distinct styled treatment when reply contains "don't have that in my knowledge"), `src/app/embed/[slug]/page.tsx` (pass new props)
- Modify: `src/app/app/page.tsx` + `src/components/Dashboard.tsx` → five tabs (Task 7 completes Knowledge/Refine)

**Interfaces:**
- Consumes: `twins.avatar_url,links,greeting,appearance,persona` columns; TwinChat stays the single chat component for page + embed.

- [ ] Steps: implement → build PASS → manual smoke on dev server (`/{slug}?q=...` auto-asks) → commit `feat: public twin page redesign with profile hero and citations panel`.

---

### Task 7: Dashboard 5 tabs + bulk import + wiki viewer + corrections

**Files:**
- Create: `src/lib/ingest/discover.ts`, `src/app/api/discover/route.ts`, `src/components/dashboard/ProfileTab.tsx`, `src/components/dashboard/KnowledgeTab.tsx`, `src/components/dashboard/BehaviorTab.tsx`, `src/components/dashboard/ShareTab.tsx`, `src/components/dashboard/BulkImport.tsx`
- Modify: `src/components/Dashboard.tsx` (tab shell: Profile / Knowledge / Behavior / Refine / Share), `src/app/app/page.tsx` (select new columns + wiki markdown for the twin), `src/lib/ingest/errors.ts` (+`sitemap_not_found`, `sitemap_too_large`, `feed_invalid`, `channel_not_found`, `channel_no_videos`), `src/app/api/ingest/route.ts` (DELETE support is NOT here — source delete route below)
- Create: `src/app/api/source/route.ts` (DELETE `{twinId, sourceId}` → auth + ownership → delete row → reindex)
- Test: extend `tests/ingest.test.ts` with discover fixtures (sitemap urlset, sitemap index recursion ≤3 levels ≤500 URLs, malformed XML → `feed_invalid`, RSS fallback, robots.txt pointer)

**Interfaces:**
- Produces:
  - `discoverSite(url: string): Promise<{items: {url: string; title: string | null; lastmod: string | null}[]}>` — robots.txt `Sitemap:` lines → `/sitemap.xml` → RSS/Atom `<link>`/`<item>`; all via `safeFetch`; throws typed IngestError.
  - `discoverChannel(url: string): Promise<{items: {videoId: string; title: string; duration: string | null; published: string | null}[]}>` via youtubei.js.
  - `POST /api/discover` `{twinId, kind: "site"|"channel", url}` (auth, ownership, rate-limit 5/min) → `{items, budget: {remainingWords, remainingSources}}`.
  - `BulkImport` drives: select items → sequential `POST /api/ingest` (`skipReindex: true`, concurrency 2, per-row status/retry) → `POST /api/twin/reindex`.
  - KnowledgeTab: source list with delete, BulkImport, read-only wiki `<details>` viewer, "Add a correction" textarea → `POST /api/ingest` `{sourceType: "correction"}`.

- [ ] Steps: failing discover tests → implement discover lib → API → tabs UI → tests + build PASS → commit `feat: bulk import (sitemap/RSS/channel), 5-tab dashboard, wiki viewer + corrections`.

---

### Task 8: Final verification

- [ ] `npx tsx tests/ingest.test.ts` and `npx tsx tests/persona.test.ts` — all PASS.
- [ ] `npm run build` — all routes compile.
- [ ] Dev-server smoke: landing 200, `/app` 200, `/{slug}?q=` auto-ask, discover route validates input, ingest rejects bad `sourceType`.
- [ ] Update `README.md` repo map + `docs/DEVELOPMENT.md` (new flows, honest verified-vs-not).
- [ ] Push; run security advisors once more.
