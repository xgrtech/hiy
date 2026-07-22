-- Crash-safe reindex: chunks carry an index_version. A rebuild writes a new
-- version, and only after every row lands does it drop the old version.
-- Retrieval always reads the latest version, so a failed/timed-out rebuild
-- leaves the previous index fully intact instead of an empty/partial one.
alter table public.chunks
  add column if not exists index_version int not null default 1;

create index if not exists chunks_twin_version_idx
  on public.chunks (twin_id, index_version);

-- match_chunks now scopes to the twin's latest version only.
create or replace function public.match_chunks(
  p_twin_id uuid,
  p_query_embedding vector,
  p_match_count integer default 6
)
returns table(id uuid, content text, source_title text, similarity double precision)
language sql stable security definer
set search_path to 'public', 'extensions'
as $function$
  select c.id, c.content, c.source_title,
         1 - (c.embedding <=> p_query_embedding) as similarity
  from public.chunks c
  where c.twin_id = p_twin_id
    and c.embedding is not null
    and c.index_version = (
      select max(index_version) from public.chunks where twin_id = p_twin_id
    )
  order by c.embedding <=> p_query_embedding
  limit p_match_count
$function$;
