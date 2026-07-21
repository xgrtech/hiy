-- hiy.ai initial multi-tenant schema (spec rev 2)
-- NOTE: already applied to the live project (pbkdokxafuoiagvjeigm) via MCP
-- on 2026-07-21. Kept here so the schema is versioned with the code and can
-- be replayed onto a fresh/local Supabase (supabase db reset / db push).
create extension if not exists vector;

create table public.tiers (
  id text primary key,
  name text not null,
  caps jsonb not null default '{}'::jsonb
);
insert into public.tiers (id, name, caps) values
  ('free', 'Free', '{"max_words": 10000, "max_sources": 5, "monthly_messages": 300, "branding": true, "inline_embed": true, "bubble_embed": false, "full_analytics": false}'),
  ('pro',  'Pro',  '{"max_words": 500000, "max_sources": 50, "monthly_messages": 5000, "branding": false, "inline_embed": true, "bubble_embed": true, "full_analytics": true}');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique check (username ~ '^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$'),
  display_name text,
  tier_id text not null default 'free' references public.tiers(id),
  created_at timestamptz not null default now()
);

create table public.reserved_usernames (
  username text primary key,
  reason text
);
insert into public.reserved_usernames (username, reason) values
  ('admin','system'),('api','system'),('app','system'),('www','system'),
  ('hiy','system'),('help','system'),('support','system'),('about','system'),
  ('blog','system'),('pricing','system'),('login','system'),('signup','system'),
  ('settings','system'),('embed','system'),('legal','system'),('terms','system'),
  ('privacy','system');

create table public.twins (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references public.profiles(id) on delete cascade,
  slug text unique not null,
  name text not null,
  role_line text,
  bio text,
  greeting text,
  suggested_questions jsonb not null default '[]'::jsonb,
  guardrail_topics jsonb not null default '[]'::jsonb,
  appearance jsonb not null default '{}'::jsonb,
  status text not null default 'draft' check (status in ('draft','indexing','live','disabled')),
  is_ephemeral boolean not null default false,
  expires_at timestamptz,
  identity_confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ephemeral_or_owned check (is_ephemeral or owner_id is not null)
);
create index twins_owner_idx on public.twins(owner_id);
create index twins_expires_idx on public.twins(expires_at) where is_ephemeral;

create table public.sources (
  id uuid primary key default gen_random_uuid(),
  twin_id uuid not null references public.twins(id) on delete cascade,
  type text not null check (type in ('manual','linkedin','blog','youtube','file')),
  title text not null,
  url text,
  raw_text text not null,
  word_count int not null,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index sources_twin_idx on public.sources(twin_id);

create table public.wikis (
  twin_id uuid primary key references public.twins(id) on delete cascade,
  markdown text not null default '',
  updated_at timestamptz not null default now()
);

create table public.chunks (
  id uuid primary key default gen_random_uuid(),
  twin_id uuid not null references public.twins(id) on delete cascade,
  source_id uuid references public.sources(id) on delete cascade,
  content text not null,
  source_title text not null default '',
  embedding vector(1536),
  created_at timestamptz not null default now()
);
create index chunks_twin_idx on public.chunks(twin_id);
create index chunks_embedding_idx on public.chunks
  using hnsw (embedding vector_cosine_ops);

create table public.chat_sessions (
  id uuid primary key default gen_random_uuid(),
  twin_id uuid not null references public.twins(id) on delete cascade,
  visitor_hash text,
  origin_domain text,
  created_at timestamptz not null default now()
);
create index chat_sessions_twin_idx on public.chat_sessions(twin_id);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.chat_sessions(id) on delete cascade,
  role text not null check (role in ('user','assistant')),
  content text not null,
  cited_sources jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);
create index messages_session_idx on public.messages(session_id);

create table public.usage_counters (
  twin_id uuid not null references public.twins(id) on delete cascade,
  month date not null,
  messages_used int not null default 0,
  words_indexed int not null default 0,
  primary key (twin_id, month)
);

create table public.allowed_domains (
  id uuid primary key default gen_random_uuid(),
  twin_id uuid not null references public.twins(id) on delete cascade,
  domain text not null,
  unique (twin_id, domain)
);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  twin_id uuid not null references public.twins(id) on delete cascade,
  reason text not null,
  reporter_contact text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.twins enable row level security;
alter table public.sources enable row level security;
alter table public.wikis enable row level security;
alter table public.chunks enable row level security;
alter table public.chat_sessions enable row level security;
alter table public.messages enable row level security;
alter table public.usage_counters enable row level security;
alter table public.allowed_domains enable row level security;
alter table public.reports enable row level security;
alter table public.tiers enable row level security;
alter table public.reserved_usernames enable row level security;

create policy "own profile read" on public.profiles
  for select using (auth.uid() = id);
create policy "own profile update" on public.profiles
  for update using (auth.uid() = id);
create policy "own profile insert" on public.profiles
  for insert with check (auth.uid() = id);

create policy "tiers readable" on public.tiers for select using (true);
create policy "reserved readable" on public.reserved_usernames for select using (true);

create policy "owner twins all" on public.twins
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "public live twins read" on public.twins
  for select using (status = 'live');

create policy "owner sources" on public.sources
  for all using (exists (select 1 from public.twins t where t.id = twin_id and t.owner_id = auth.uid()));
create policy "owner wikis" on public.wikis
  for all using (exists (select 1 from public.twins t where t.id = twin_id and t.owner_id = auth.uid()));

create policy "owner chunks read" on public.chunks
  for select using (exists (select 1 from public.twins t where t.id = twin_id and t.owner_id = auth.uid()));

create policy "owner sessions read" on public.chat_sessions
  for select using (exists (select 1 from public.twins t where t.id = twin_id and t.owner_id = auth.uid()));
create policy "owner messages read" on public.messages
  for select using (exists (
    select 1 from public.chat_sessions s join public.twins t on t.id = s.twin_id
    where s.id = session_id and t.owner_id = auth.uid()));

create policy "owner usage read" on public.usage_counters
  for select using (exists (select 1 from public.twins t where t.id = twin_id and t.owner_id = auth.uid()));

create policy "owner domains" on public.allowed_domains
  for all using (exists (select 1 from public.twins t where t.id = twin_id and t.owner_id = auth.uid()));

create policy "anyone report insert" on public.reports
  for insert with check (true);

create or replace function public.touch_updated_at() returns trigger
language plpgsql security definer set search_path = public as $$
begin new.updated_at = now(); return new; end $$;
create trigger twins_touch before update on public.twins
  for each row execute function public.touch_updated_at();

create or replace function public.match_chunks(
  p_twin_id uuid,
  p_query_embedding vector(1536),
  p_match_count int default 6
) returns table (id uuid, content text, source_title text, similarity float)
language sql stable security definer set search_path = public as $$
  select c.id, c.content, c.source_title,
         1 - (c.embedding <=> p_query_embedding) as similarity
  from public.chunks c
  where c.twin_id = p_twin_id and c.embedding is not null
  order by c.embedding <=> p_query_embedding
  limit p_match_count
$$;
revoke execute on function public.match_chunks from anon, authenticated;
