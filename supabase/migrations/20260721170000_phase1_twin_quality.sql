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
-- Writes go through the service role only (authed API route) — no insert policy.
