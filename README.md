# hiy.ai

**A twin that talks like you — and knows when to say "I don't know."**

Multi-tenant SaaS: a creator signs up, connects their content (blog posts,
YouTube, résumé, pasted text), and gets a hosted, cited, honest-by-default
AI twin at `hiy.ai/{username}` — shareable by link and embeddable on their
own site.

Built with Next.js 16 (App Router) · Supabase (Postgres + pgvector + Auth)
· Vercel AI SDK (Anthropic / OpenAI, provider-agnostic) · Tailwind v4.

## Quickstart

```bash
npm install
cp .env.example .env.local   # then fill in keys — see docs/SETUP.md
npm run dev                  # http://localhost:3000
```

Three secrets are required for full functionality (details in
[docs/SETUP.md](docs/SETUP.md)):

| Env var | Needed for | Where to get it |
|---|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | everything DB-backed | Supabase dashboard → Settings → API |
| `OPENAI_API_KEY` | embeddings (retrieval) + chat fallback | platform.openai.com |
| `ANTHROPIC_API_KEY` | chat (preferred when set) | console.anthropic.com |

Without LLM keys the app runs but chat returns 503 and indexing falls back
to keyword retrieval. Without the service-role key, no DB-backed route works.

## Tests

```bash
npx tsx tests/ingest.test.ts   # ingestion + discovery suite — 36 tests
npx tsx tests/persona.test.ts  # persona + prompt + interview suite — 13 tests
npm run build                  # type-checks and compiles all routes
```

## Repository map

```
supabase/migrations/   Schema (3 migrations — ALREADY APPLIED to the live
                       project pbkdokxafuoiagvjeigm; kept for versioning /
                       replaying onto a fresh or local Supabase)
src/lib/ingest/        Ingestion library incl. bulk discovery (hardened — see docs)
src/lib/rag/           Wiki synthesis, chunking, retrieval, prompt, persona
src/lib/interview/     Personality-interview question bank + formatting
src/lib/llm/           Provider-agnostic LLM + embeddings (AI SDK)
src/lib/caps.ts        Tier caps enforcement (billing deferred by design)
src/lib/ratelimit.ts   Best-effort burst limiter for public endpoints
src/app/api/           chat · ingest · instant · discover · interview (+gaps) ·
                       source · twin (+profile · avatar · reindex) · report
src/app/               landing · /[slug] public twin (?q= deep links) ·
                       /embed/[slug] · /app dashboard · /report/[slug]
src/components/        TwinChat · InterviewFlow · Dashboard (5 tabs in
                       dashboard/) · InstantTwin · SignIn · Onboard
public/embed.js        Inline-embed loader script (lazy iframe)
tests/                 Ingestion + persona test suites
docs/                  SETUP.md · DEVELOPMENT.md · DEPLOY.md · superpowers/
```

## Documentation

- **[docs/SETUP.md](docs/SETUP.md)** — local setup end to end: keys,
  Google OAuth configuration, verification checklist.
- **[docs/DEVELOPMENT.md](docs/DEVELOPMENT.md)** — architecture, key flows,
  how to extend (new ingestion sources, tiers, guardrails), roadmap, and an
  honest list of what is and isn't yet runtime-verified.
- **[docs/DEPLOY.md](docs/DEPLOY.md)** — Vercel deployment + hiy.ai domain.

## Product decisions (locked — see project spec for full detail)

Pure SaaS (creators pay, visitors always chat free) · one twin per creator ·
no public directory · free tier at hiy.ai/name with content/message caps +
branding · free inline embed (the distribution loop), bubble embed paid ·
Stripe deferred until tiers activate · voice deferred · citations and
"I don't know" behavior are defaults, never paywalled · impersonation
policy: you may only twin yourself; every public page has a report link.
