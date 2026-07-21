# Deploying to Vercel + the hiy.ai domain

## 1. Push the repo to Git

Vercel deploys best from a Git repo (GitHub/GitLab/Bitbucket).

```bash
git init && git add -A && git commit -m "hiy.ai v1"
# create a repo on GitHub, then:
git remote add origin git@github.com:YOU/hiy-ai.git
git push -u origin main
```

`.env.local` is gitignored by default — verify with `git status` that no
secret ever lands in the repo.

## 2. Create the Vercel project

vercel.com → Add New → Project → import the repo. Framework preset:
Next.js (auto-detected). No custom build settings needed.

## 3. Environment variables (Project → Settings → Environment Variables)

| Name | Environment | Value |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | All | `https://pbkdokxafuoiagvjeigm.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | All | the publishable key (in `.env.example`) |
| `SUPABASE_SERVICE_ROLE_KEY` | All | from Supabase dashboard (Sensitive ✓) |
| `ANTHROPIC_API_KEY` | All | your key (Sensitive ✓) |
| `OPENAI_API_KEY` | All | your key (Sensitive ✓) |
| `NEXT_PUBLIC_APP_URL` | Production | `https://hiy.ai` |

## 4. Domain

Project → Settings → Domains → add `hiy.ai` (and `www.hiy.ai` → redirect).
Follow Vercel's DNS instructions at your registrar (A/ALIAS + CNAME).

## 5. OAuth for production

- Google Cloud console → your OAuth client → add authorized redirect URI
  (unchanged — it's the Supabase callback):
  `https://pbkdokxafuoiagvjeigm.supabase.co/auth/v1/callback`
- Supabase → Authentication → URL Configuration:
  - Site URL: `https://hiy.ai`
  - Additional redirect URLs: `https://hiy.ai/auth/callback`
    (keep the localhost one for development)

## 6. Post-deploy smoke test

Run the docs/SETUP.md §6 checklist against the production URL, plus:
- A blog-URL ingest and a YouTube ingest from production (egress now real —
  first genuine test of live fetching; YouTube may still hit the designed
  paste-transcript fallback from datacenter IPs, which is expected)
- The embed snippet on an external site (e.g. a GitHub Pages test page)

## 7. Optional hardening (soon after launch)

- Vercel cron hitting an endpoint that deletes expired ephemeral twins
- Upstash Redis rate limiting on /api/chat and /api/instant
- Sentry (or Vercel's own) error monitoring on the API routes
- `next.config.ts` headers: X-Frame-Options DENY everywhere EXCEPT
  /embed/* (which must stay frameable)
