# Local setup — end to end

Follow this once and you'll have the full stack running locally against the
**live** Supabase project. (Option B at the bottom covers running a fully
local Supabase instead.)

## 0. Prerequisites

- Node 20+ (built on Node 22) and npm
- The repo, with `npm install` run

## 1. Environment file

```bash
cp .env.example .env.local
```

`.env.local` already ships with the two **public** Supabase values filled in
(they're publishable — safe in a browser):

```
NEXT_PUBLIC_SUPABASE_URL=https://pbkdokxafuoiagvjeigm.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_9zHznv4iSz2YH2bKslf4CA_AahE6XbV
```

## 2. Supabase service-role key (required)

The server uses this for RAG indexing, public chat, instant twins, and
report intake. It bypasses RLS — **never** expose it client-side or commit it.

1. Open https://supabase.com/dashboard/project/pbkdokxafuoiagvjeigm/settings/api
2. Copy the `service_role` secret key
3. Set `SUPABASE_SERVICE_ROLE_KEY=...` in `.env.local`

## 3. LLM keys

- `OPENAI_API_KEY` — **required for retrieval quality**: embeddings are
  OpenAI `text-embedding-3-small` (1536-dim, matches the pgvector schema).
  Also serves as the chat fallback (gpt-4o-mini).
- `ANTHROPIC_API_KEY` — optional but preferred for chat (claude-sonnet-4-5).
  When both are set, Anthropic answers chats; OpenAI does embeddings.

Behavior with missing keys (graceful, but degraded):
- No OpenAI key → indexing stores chunks without vectors; retrieval falls
  back to naive keyword rank. Works, visibly worse.
- No LLM key at all → wiki synthesis becomes plain concatenation and
  `/api/chat` returns 503 with a clear message.

## 4. Google sign-in (required for the creator dashboard)

The public twin pages and instant-twin flow work without this. The /app
dashboard needs it.

**A. Google Cloud console** (console.cloud.google.com → APIs & Services →
Credentials):
1. Create an OAuth 2.0 Client ID (type: Web application)
2. Authorized redirect URI:
   `https://pbkdokxafuoiagvjeigm.supabase.co/auth/v1/callback`
3. Copy the Client ID + Client Secret

**B. Supabase dashboard** (Authentication → Sign In / Up → Providers → Google):
1. Enable Google, paste Client ID + Secret, save

**C. Supabase URL configuration** (Authentication → URL Configuration):
1. Site URL: `http://localhost:3000` (change to https://hiy.ai after deploy)
2. Additional redirect URLs: `http://localhost:3000/auth/callback`

## 5. Run

```bash
npm run dev
```

## 6. Verification checklist (do these in order)

1. `npx tsx tests/ingest.test.ts` → 29 passed
2. Open http://localhost:3000 — landing renders: breathing orb, doodle
   underline draws itself, instant-twin card on the right
3. **Instant twin**: enter a name + paste ~100 words about yourself →
   "Meet your twin" → you should land on `/preview-xxxxxxxx` and get
   streaming, cited answers (needs service-role + LLM keys)
4. **Sign in** at /app with Google → claim a username → dashboard
5. **Ingest each source type**: paste text · upload a PDF · a blog URL ·
   a YouTube URL (if YouTube blocks the fetch you'll be switched to the
   paste-transcript flow — that's designed, not a bug) · LinkedIn paste
6. Open `/{your-username}` — chat, confirm citations appear under answers
7. Embed test: drop the snippet from the dashboard into any local HTML
   file and open it — the iframe should lazy-load the chat

## Option B: fully local Supabase (optional)

If you'd rather not develop against the live project:

```bash
npx supabase init      # if supabase/config.toml doesn't exist yet
npx supabase start     # local Postgres+Auth+Studio via Docker
npx supabase db reset  # applies supabase/migrations/*.sql
```

Then point `.env.local` at the local URL/keys that `supabase start` prints.
The migrations in `supabase/migrations/` are the source of truth and replay
cleanly on a fresh database.

## Costs to be aware of

- Supabase project `hiy-ai`: **$10/month** (pause or delete in the dashboard
  to stop it)
- LLM usage: per-token on your keys; wiki synthesis runs once per source
  added, chat per message. Small during development.
