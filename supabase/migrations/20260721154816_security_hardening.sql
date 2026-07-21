-- Fix advisor findings from initial_schema (already applied to live project)

-- 1) match_chunks: the PUBLIC default grant kept it callable by anon.
revoke execute on function public.match_chunks(uuid, vector, int) from public, anon, authenticated;

-- 2) touch_updated_at: no reason to be SECURITY DEFINER or RPC-callable.
create or replace function public.touch_updated_at() returns trigger
language plpgsql security invoker set search_path = public as $$
begin new.updated_at = now(); return new; end $$;
revoke execute on function public.touch_updated_at() from public, anon, authenticated;

-- 3) reports: drop always-true anon INSERT; reports flow through our API
--    (service role bypasses RLS) so we can rate-limit and validate there.
drop policy "anyone report insert" on public.reports;

-- 4) move pgvector out of public schema (Supabase convention: extensions)
create schema if not exists extensions;
alter extension vector set schema extensions;

create or replace function public.match_chunks(
  p_twin_id uuid,
  p_query_embedding extensions.vector(1536),
  p_match_count int default 6
) returns table (id uuid, content text, source_title text, similarity float)
language sql stable security definer set search_path = public, extensions as $$
  select c.id, c.content, c.source_title,
         1 - (c.embedding <=> p_query_embedding) as similarity
  from public.chunks c
  where c.twin_id = p_twin_id and c.embedding is not null
  order by c.embedding <=> p_query_embedding
  limit p_match_count
$$;
revoke execute on function public.match_chunks(uuid, extensions.vector, int) from public, anon, authenticated;
