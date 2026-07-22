-- Production hardening: enforce one-twin-per-owner at the DB, make the
-- monthly message cap an atomic operation, and add a Postgres-backed rate
-- limiter that works across serverless instances (the in-memory Map didn't).

-- 1) One non-ephemeral twin per owner (app-logic SELECT-then-INSERT raced).
create unique index if not exists twins_one_per_owner
  on public.twins (owner_id)
  where owner_id is not null and not is_ephemeral;

-- 2) Atomic monthly message counter. Returns true iff this message is within
--    the cap AND has been counted; false means the cap is already reached.
--    The conditional UPDATE + INSERT-on-conflict makes check-and-increment a
--    single statement, so concurrent chats can't race past the limit.
create or replace function public.try_increment_message_usage(
  p_twin_id uuid,
  p_month date,
  p_limit int
) returns boolean
language plpgsql
as $$
declare
  v_used int;
begin
  insert into public.usage_counters (twin_id, month, messages_used)
  values (p_twin_id, p_month, 1)
  on conflict (twin_id, month) do update
    set messages_used = public.usage_counters.messages_used + 1
    where public.usage_counters.messages_used < p_limit
  returning messages_used into v_used;

  -- Row returned → either a fresh insert or an allowed increment.
  return v_used is not null;
end;
$$;

-- 3) Cross-instance rate limiter. One row per (bucket, window); an atomic
--    upsert increments the counter and the caller compares against the limit.
create table if not exists public.rate_limits (
  bucket text not null,
  window_start bigint not null, -- epoch ms of the fixed window
  count int not null default 0,
  primary key (bucket, window_start)
);
alter table public.rate_limits enable row level security;
-- service-role only; no policies means anon/authenticated can't touch it.

create or replace function public.hit_rate_limit(
  p_bucket text,
  p_window_start bigint,
  p_limit int
) returns boolean
language plpgsql
as $$
declare
  v_count int;
begin
  insert into public.rate_limits (bucket, window_start, count)
  values (p_bucket, p_window_start, 1)
  on conflict (bucket, window_start) do update
    set count = public.rate_limits.count + 1
  returning count into v_count;

  -- true = allowed (within limit), false = throttled.
  return v_count <= p_limit;
end;
$$;

-- Opportunistic cleanup helper (call from a cron/edge fn later if desired).
create or replace function public.prune_rate_limits(p_before bigint)
returns void language sql as $$
  delete from public.rate_limits where window_start < p_before;
$$;
