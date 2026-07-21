# Phase 1: Twin Quality — Design

**Date:** 2026-07-21
**Status:** Approved (design review with owner, section by section)
**Scope:** First sub-project of the Delphi-scale roadmap (see Roadmap Context)

## Goal

Make the twin experience impressive enough that real creators sign up and
share their link: a visitor should say "this actually feels like the
creator," and a creator should be proud of their public page. Success in
the next 1–2 months = first real creators sharing `hiy.ai/{username}`.

## Roadmap context (approved decomposition)

hiy is being grown from MVP toward a Delphi.ai-class product in four
phases, each with its own spec → plan → build cycle:

1. **Twin quality** (this spec): personality interview + persona,
   bulk ingestion, public page redesign, creator editors.
2. **Growth engine:** analytics dashboard (top questions, knowledge
   gaps), consent-based contact capture + export, share card/QR,
   scheduled re-crawl, Upstash rate limiting, ephemeral cleanup.
3. **Business platform:** Stripe + tier activation, bubble embed +
   allowed-domain enforcement, branding removal, color kits,
   collaborators, custom domains.
4. **Voice + integrations:** TTS voice replies → realtime voice calls →
   Slack/WhatsApp/API. (Deliberately last — owner decision.)

**Positioning (locked):** "Honest twin, Delphi scale." Citations and
"I don't know" behavior stay defaults and are never paywalled; persona
shapes *style*, never invents *facts*.

## Architecture principle

Everything the creator teaches the twin — interview answers, corrections,
bulk imports — is **just another `sources` row** flowing through the
existing pipeline (wiki synthesis → chunking → embedding → retrieval).
One pipeline, one mental model; the existing fixture-driven ingest test
suite keeps protecting all of it.

## Data model (one new migration)

- `sources.type` check constraint gains `'interview'` and `'correction'`.
- `twins.persona` (jsonb, nullable): synthesized persona profile —
  tone descriptors, style notes, signature phrases, boundary rules,
  first-person facts. Written by persona synthesis; read by
  `buildSystemPrompt`.
- `twins.avatar_url` (text, nullable) and `twins.links` (jsonb, default
  `[]`, array of `{label, url}`) for the public profile.
- Supabase Storage bucket `avatars`: public-read. Uploads go through an
  authed API route (not direct client upload) so the server enforces the
  2MB cap and image-type sniffing.
- No job-queue table in this phase (client-driven batch import instead);
  a queue arrives with phase-2 scheduled re-sync if needed.

## Component 1: Personality interview ("Refine" tab)

Chat-style flow in the dashboard where the twin interviews its creator.

- **Seed question bank** (~15–20 questions, static config in
  `src/lib/interview/questions.ts`) in five groups: voice & tone,
  strong opinions, FAQs (questions people always ask + the answers),
  boundaries (what the twin must refuse), bio gaps.
- **Adaptive gap questions:** after sources are indexed, an LLM pass
  reads the wiki and generates questions about missing knowledge. In
  phase 2 the same queue is fed by unanswered visitor questions.
- One question at a time; skippable; re-runnable; resumable on the same
  browser (in-progress state lives in localStorage; only completed
  sessions persist server-side).
- **Storage:** each completed session = one `sources` row of type
  `interview` — formatted Q&A transcript in `raw_text`, structured pairs
  in `meta.qa`. Citable in chat as "from my interview".
- **Persona synthesis** (`src/lib/rag/persona.ts`): after each interview
  and on every reindex, an LLM call distills interview + sources into
  `twins.persona`. `buildSystemPrompt` renders it as a "how you speak"
  block. Boundary answers merge into the existing `guardrail_topics`
  mechanism.
- **Honesty invariant:** persona affects style only. Factual claims still
  come from retrieval with citations; "I don't know" behavior unchanged.

## Component 2: Bulk ingestion (discover → select → batch import)

- **New endpoint `POST /api/discover`** (auth required, rate limited,
  zod-validated): takes `{kind: 'site' | 'channel', url}` and returns a
  list of importable items plus the twin's remaining capacity budget
  (from `caps.ts`). It never ingests anything itself. All fetching goes
  through the existing hardened `safeFetch` (SSRF guard, size caps).
  - **Site:** robots.txt sitemap declaration → `/sitemap.xml` (recursing
    into sitemap indexes) → RSS/Atom feed fallback. Returns URLs with
    lastmod where available. No free-form link crawling in this phase.
  - **Channel:** YouTube channel URL or `@handle` → `youtubei.js`
    listing (video id, title, duration, date). Videos without
    transcripts are flagged so the UI can offer the existing
    paste-transcript fallback per video.
- **Import flow (client-driven):** dashboard shows a checklist
  preselected within budget; client calls the existing `POST /api/ingest`
  once per item, sequentially with concurrency 2, each with a new
  `skipReindex` flag; per-row progress with typed errors and retry.
  One final reindex call rebuilds wiki + chunks after the batch (also
  fixes today's inefficiency of full re-synthesis per source).
- **Caps stay authoritative server-side** in `/api/ingest`; the discover
  budget is advisory UI state only.
- **New `IngestError` codes:** `sitemap_not_found`, `sitemap_too_large`,
  `feed_invalid`, `channel_not_found`, `channel_no_videos`.

## Component 3: Public twin page redesign

- Hero: avatar, name, role line, bio, social links.
- **Suggested-question chips** that prefill the chat, and `?q=` deep
  links (`/{slug}?q=...` auto-asks) so shared links land on a great
  first answer.
- Citations: numbered inline markers + collapsible sources panel
  (linking out where the source has a URL). "I don't know" replies get
  a distinct, intentional visual treatment — it is the brand.
- Footer: report link (kept) + "Create your own twin" growth loop.
- `/embed/{slug}` inherits all chat improvements.
- Appearance: accent color + light/dark stored in existing
  `twins.appearance` jsonb, applied via CSS variables.

## Component 4: Creator dashboard (five tabs)

- **Profile:** avatar upload, name, role line, bio, links.
- **Knowledge:** source list with delete; bulk import (Component 2);
  read-only **wiki viewer** ("what your twin knows"); **"Add a
  correction"** flow — creator writes a correction, stored as a
  `correction` source; synthesis and prompts treat corrections as
  authoritative over other sources. (Direct wiki markdown editing is
  deliberately out of scope — corrections deliver the trust story
  without merge-on-regenerate complexity.)
- **Behavior:** greeting, suggested-questions editor, guardrail-topics
  editor.
- **Refine:** the interview (Component 1).
- **Share:** public link, embed snippet.

## Error handling

All user-triggered operations keep the typed-`IngestError` pattern:
stable `code`, user-facing copy, `retryable` flag. New routes use the
same response envelope as existing routes. Batch import surfaces
per-item errors without aborting the batch.

## Testing

- Extend `tests/ingest.test.ts`: sitemap urlset + index recursion,
  malformed XML, RSS/Atom fallback, robots.txt discovery, channel
  listing with `youtubei.js` mocked, new error codes.
- New `tests/persona.test.ts` (LLM mocked): interview Q&A → persona
  shape; persona block present in system prompt; corrections outrank
  other sources; guardrail merging.
- API-level: `discover` zod validation, caps enforcement under batch,
  `skipReindex` semantics.
- Playwright E2E (sign-in → import → chat) becomes the acceptance gate
  once live keys are configured.

## Build order (each lands as a working slice on main)

1. Migration + prompt plumbing (`persona`, `links`, `avatar_url`, new
   source types, `skipReindex`).
2. Public page redesign + Profile/Behavior editors (fastest visible win).
3. Interview + persona synthesis.
4. Bulk ingestion (discover endpoint + batch import UI).
5. Wiki viewer + corrections, then polish pass.

## Out of scope (phase 1)

Analytics, contact capture, Stripe/monetization, voice, scheduled
re-sync, custom domains, collaborators, multi-language UI, free-form
site crawling, direct wiki editing.
