-- Shared (multi-device) single-event setup for Secret Santa
-- Run this in Supabase Dashboard -> SQL Editor.
--
-- Security model:
-- - Public (anon) can READ events/participants/gifts for the global event.
-- - Direct writes are blocked by RLS.
-- - All writes happen through SECURITY DEFINER RPC functions.
-- - Identity is a (participant_id + player_key) pair minted at join time.
--
-- You must set a passcode once (see section at bottom).

begin;

-- 1) Extensions
create extension if not exists pgcrypto;

-- 2) Columns to support passcode + player keys
alter table public.events
  add column if not exists event_code text unique,
  add column if not exists passcode_hash text;

alter table public.participants
  add column if not exists player_key_hash text,
  add column if not exists is_ready boolean not null default false;

-- Helpful uniqueness: one display name per event
do $$
begin
  if not exists (
    select 1 from pg_indexes where schemaname='public' and indexname='participants_event_display_name_unique'
  ) then
    create unique index participants_event_display_name_unique on public.participants(event_id, lower(display_name));
  end if;
end $$;

-- 3) Helper functions
create or replace function public.ss_hash_secret(secret text)
returns text
language sql
stable
as $$
  select encode(digest(secret, 'sha256'), 'hex');
$$;

create or replace function public.ss_check_secret(secret text, secret_hash text)
returns boolean
language sql
stable
as $$
  select public.ss_hash_secret(secret) = secret_hash;
$$;

create or replace function public.ss_random_key()
returns text
language sql
stable
as $$
  select encode(gen_random_bytes(32), 'hex');
$$;

-- 4) Single global event helpers
create or replace function public.ss_get_or_create_global_event()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  eid uuid;
begin
  select id into eid
  from public.events
  where event_code = 'GLOBAL'
  limit 1;

  if eid is null then
    -- created_by is required by your schema; use a zero UUID sentinel.
    -- This avoids needing Supabase Auth for the multi-device version.
    insert into public.events (name, created_by, event_code)
    values ('Secret Santa', '00000000-0000-0000-0000-000000000000', 'GLOBAL')
    returning id into eid;
  end if;

  return eid;
end;
$$;

-- 5) RPC: set/change global passcode (run once by the host)
-- This is SECURITY DEFINER; anyone who calls it could change the passcode.
-- If you want to lock this down, we can add an admin_secret check.
create or replace function public.ss_set_global_passcode(new_passcode text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  eid uuid;
begin
  if new_passcode is null or length(trim(new_passcode)) < 4 then
    raise exception 'Passcode must be at least 4 characters';
  end if;

  eid := public.ss_get_or_create_global_event();
  update public.events
    set passcode_hash = public.ss_hash_secret(new_passcode)
  where id = eid;
end;
$$;

-- 6) RPC: join global event
-- Validates passcode, then creates participant if missing.
-- Returns: event_id, participant_id, player_key (store player_key client-side)
create or replace function public.ss_join_global_event(passcode text, display_name text)
returns table(event_id uuid, participant_id uuid, player_key text)
language plpgsql
security definer
set search_path = public
as $$
declare
  eid uuid;
  phash text;
  p_id uuid;
  pkey text;
begin
  eid := public.ss_get_or_create_global_event();

  select passcode_hash into phash from public.events where id = eid;
  if phash is null then
    raise exception 'Global event passcode not set yet';
  end if;

  if not public.ss_check_secret(passcode, phash) then
    raise exception 'Invalid passcode';
  end if;

  if display_name is null or length(trim(display_name)) < 1 then
    raise exception 'Display name is required';
  end if;

  -- existing participant?
  select id into p_id
  from public.participants
  where event_id = eid and lower(display_name) = lower(trim(display_name))
  limit 1;

  if p_id is null then
    pkey := public.ss_random_key();
    insert into public.participants(event_id, user_id, display_name, player_key_hash)
    values (eid, '00000000-0000-0000-0000-000000000000', trim(display_name), public.ss_hash_secret(pkey))
    returning id into p_id;
  else
    -- If participant exists, mint a new key and rotate it (so you can re-join).
    pkey := public.ss_random_key();
    update public.participants
      set player_key_hash = public.ss_hash_secret(pkey)
    where id = p_id;
  end if;

  return query select eid, p_id, pkey;
end;
$$;

-- 7) RPC: remove yourself
create or replace function public.ss_remove_me(p_event_id uuid, p_participant_id uuid, p_player_key text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  phash text;
begin
  select player_key_hash into phash
  from public.participants
  where id = p_participant_id and event_id = p_event_id;

  if phash is null or not public.ss_check_secret(p_player_key, phash) then
    raise exception 'Unauthorized';
  end if;

  delete from public.participants where id = p_participant_id;
end;
$$;

-- 8) RPC: set ready
create or replace function public.ss_set_ready(p_event_id uuid, p_participant_id uuid, p_player_key text, p_ready boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  phash text;
begin
  select player_key_hash into phash
  from public.participants
  where id = p_participant_id and event_id = p_event_id;

  if phash is null or not public.ss_check_secret(p_player_key, phash) then
    raise exception 'Unauthorized';
  end if;

  update public.participants
    set is_ready = coalesce(p_ready, false)
  where id = p_participant_id;
end;
$$;

-- 9) RPC: reveal if everyone ready
create or replace function public.ss_reveal_if_all_ready(p_event_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  total_count int;
  ready_count int;
begin
  select count(*) into total_count from public.participants where event_id = p_event_id;
  select count(*) into ready_count from public.participants where event_id = p_event_id and is_ready = true;

  if total_count < 2 then
    return false;
  end if;

  if ready_count = total_count then
    update public.events set is_revealed = true where id = p_event_id;
    return true;
  end if;

  return false;
end;
$$;

-- 10) RPC: add gift (only as self)
create or replace function public.ss_add_gift(
  p_event_id uuid,
  p_from_participant_id uuid,
  p_player_key text,
  p_to_participant_id uuid,
  p_status text,
  p_message text,
  p_images text[],
  p_is_unlocked boolean
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  phash text;
  gid uuid;
begin
  select player_key_hash into phash
  from public.participants
  where id = p_from_participant_id and event_id = p_event_id;

  if phash is null or not public.ss_check_secret(p_player_key, phash) then
    raise exception 'Unauthorized';
  end if;

  if p_status is null then
    p_status := 'pending';
  end if;

  insert into public.gifts(
    event_id,
    from_participant_id,
    to_participant_id,
    status,
    message,
    images,
    is_unlocked
  ) values (
    p_event_id,
    p_from_participant_id,
    p_to_participant_id,
    p_status,
    p_message,
    coalesce(p_images, '{}'::text[]),
    coalesce(p_is_unlocked, false)
  ) returning id into gid;

  return gid;
end;
$$;

-- 11) RLS: allow public read, block direct writes
alter table public.events enable row level security;
alter table public.participants enable row level security;
alter table public.gifts enable row level security;

-- Drop old auth-based policies if they exist (safe to run repeatedly)
do $$
begin
  -- events
  if exists (select 1 from pg_policies where schemaname='public' and tablename='events' and policyname='Participants can view their events') then
    drop policy "Participants can view their events" on public.events;
  end if;
  if exists (select 1 from pg_policies where schemaname='public' and tablename='events' and policyname='Creator can update their events') then
    drop policy "Creator can update their events" on public.events;
  end if;
  if exists (select 1 from pg_policies where schemaname='public' and tablename='events' and policyname='Authenticated users can create events') then
    drop policy "Authenticated users can create events" on public.events;
  end if;

  -- participants
  if exists (select 1 from pg_policies where schemaname='public' and tablename='participants' and policyname='Participants can view event participants') then
    drop policy "Participants can view event participants" on public.participants;
  end if;
  if exists (select 1 from pg_policies where schemaname='public' and tablename='participants' and policyname='Users can add themselves as participants') then
    drop policy "Users can add themselves as participants" on public.participants;
  end if;
  if exists (select 1 from pg_policies where schemaname='public' and tablename='participants' and policyname='Users can update their own participant record') then
    drop policy "Users can update their own participant record" on public.participants;
  end if;
  if exists (select 1 from pg_policies where schemaname='public' and tablename='participants' and policyname='Users can delete their own participant record') then
    drop policy "Users can delete their own participant record" on public.participants;
  end if;

  -- gifts
  if exists (select 1 from pg_policies where schemaname='public' and tablename='gifts' and policyname='Participants can view gifts in their events') then
    drop policy "Participants can view gifts in their events" on public.gifts;
  end if;
  if exists (select 1 from pg_policies where schemaname='public' and tablename='gifts' and policyname='Gift sender can insert gifts') then
    drop policy "Gift sender can insert gifts" on public.gifts;
  end if;
  if exists (select 1 from pg_policies where schemaname='public' and tablename='gifts' and policyname='Gift sender can update their gifts') then
    drop policy "Gift sender can update their gifts" on public.gifts;
  end if;
  if exists (select 1 from pg_policies where schemaname='public' and tablename='gifts' and policyname='Gift sender can delete their gifts') then
    drop policy "Gift sender can delete their gifts" on public.gifts;
  end if;
end $$;

-- Public read
do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='events' and policyname='public_read_events') then
    create policy public_read_events on public.events for select using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='participants' and policyname='public_read_participants') then
    create policy public_read_participants on public.participants for select using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='gifts' and policyname='public_read_gifts') then
    create policy public_read_gifts on public.gifts for select using (true);
  end if;
end $$;

-- Block direct writes (no insert/update/delete policies)
revoke insert, update, delete on public.events from anon, authenticated;
revoke insert, update, delete on public.participants from anon, authenticated;
revoke insert, update, delete on public.gifts from anon, authenticated;

-- Allow anon/authenticated to execute the RPCs
grant execute on function public.ss_set_global_passcode(text) to anon, authenticated;
grant execute on function public.ss_join_global_event(text, text) to anon, authenticated;
grant execute on function public.ss_remove_me(uuid, uuid, text) to anon, authenticated;
grant execute on function public.ss_set_ready(uuid, uuid, text, boolean) to anon, authenticated;
grant execute on function public.ss_reveal_if_all_ready(uuid) to anon, authenticated;
grant execute on function public.ss_add_gift(uuid, uuid, text, uuid, text, text, text[], boolean) to anon, authenticated;

commit;

-- After running this script:
-- 1) Set the global passcode once:
--    select public.ss_set_global_passcode('YOUR_PASSCODE');
--
-- 2) Your invite link is:
--    https://<your-vercel-domain>/auth?event=GLOBAL
