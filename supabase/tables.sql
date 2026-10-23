-- Poker Lunch: tables (taules). One player opens a board and invites others; everyone, the host
-- included, gets the same number of tries (10) on it until the table closes (24 hours after opening),
-- and the table keeps each player's best game (its moves draw the "ghosts" in the game). Tables from
-- before the limit (no max_attempts, no closes_at) stay unlimited.
-- Every try is counted on the server when the game starts, so leaving halfway still counts as a try.
-- Applied to the shared project (the one Orca Lunch uses). Reuses name_is_clean() from Orca Lunch's SQL.
-- The game only reads the tables; every write goes through the three functions at the end.

create table if not exists public.poker_tables (
  code text primary key check (code ~ '^[a-z0-9]{6,12}$'),
  created_at timestamptz not null default now(),
  rules text not null check (rules ~ '^[a-z0-9.-]{1,32}$'),
  seed bigint not null check (seed >= 0 and seed < 4294967296),
  host_id uuid not null,
  host_name text not null check (char_length(btrim(host_name)) between 1 and 16),
  hidden boolean not null default false
);

create table if not exists public.poker_seats (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  table_code text not null references public.poker_tables(code) on delete cascade,
  player_id uuid not null,
  name text not null check (char_length(btrim(name)) between 1 and 16),
  -- The best game; empty until the first one is finished.
  score integer check (score between 0 and 10000000),
  moves text check (char_length(moves) <= 4000 and moves ~ '^[a-zA-Z0-9.,]*$'),
  finished_at timestamptz,
  -- Only the phone that sat knows it: it fills the seat in. Never readable.
  seat_key uuid not null default gen_random_uuid(),
  hidden boolean not null default false,
  check ((finished_at is null) = (score is null) and (score is null) = (moves is null)),
  -- One seat per player at each table; the tries are counted in it.
  unique (table_code, player_id)
);

-- Limits (added later; null on the tables opened before them: no limit).
alter table public.poker_tables add column if not exists max_attempts integer check (max_attempts between 1 and 1000);
alter table public.poker_tables add column if not exists closes_at timestamptz;
-- The try that made the best game: with the same score, fewer tries wins.
alter table public.poker_seats add column if not exists best_attempt integer check (best_attempt between 1 and 1000);

-- Tries (added after the first version: a table on the server that already has seats gets them here).
do $$
begin
  if not exists (select 1 from information_schema.columns
                 where table_schema = 'public' and table_name = 'poker_seats' and column_name = 'attempts') then
    alter table public.poker_seats
      -- Tries started, the one being played included.
      add column attempts integer not null default 1 check (attempts between 1 and 1000),
      -- When the last try started, and whether it is still waiting for its end.
      add column attempt_at timestamptz not null default now(),
      add column attempt_open boolean not null default false,
      -- Time spent on finished tries (ms).
      add column played_ms bigint not null default 0 check (played_ms >= 0),
      -- The try that first beat the host's best, and the time played up to then (ms).
      add column beat_attempt integer check (beat_attempt between 1 and 1000),
      add column beat_ms bigint check (beat_ms >= 0);
    update public.poker_seats set attempt_at = created_at, attempt_open = finished_at is null;
  end if;
end $$;
create index if not exists poker_seats_player on public.poker_seats (player_id, created_at);
create index if not exists poker_tables_host on public.poker_tables (host_id, created_at);
create unique index if not exists poker_seats_key on public.poker_seats (seat_key);

alter table public.poker_tables enable row level security;
alter table public.poker_seats enable row level security;

drop policy if exists "anyone reads tables" on public.poker_tables;
create policy "anyone reads tables" on public.poker_tables for select to anon, authenticated using (not hidden);
drop policy if exists "anyone reads seats" on public.poker_seats;
create policy "anyone reads seats" on public.poker_seats for select to anon, authenticated using (not hidden);

-- Reading only, and never the seat key.
revoke all on public.poker_tables from anon, authenticated;
revoke all on public.poker_seats from anon, authenticated;
grant select on public.poker_tables to anon, authenticated;
grant select (id, created_at, table_code, player_id, name, score, moves, finished_at, hidden,
  attempts, attempt_at, attempt_open, played_ms, beat_attempt, beat_ms, best_attempt) on public.poker_seats to anon, authenticated;

-- Limits: 30 new tables and 150 seats per player a day (and each table's own limit of tries, in poker_sit).
create or replace function public.poker_tables_rate_limit() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from public.poker_tables
      where host_id = new.host_id and created_at > now() - interval '1 day') >= 30 then
    raise exception 'too many tables today' using errcode = 'P0001';
  end if;
  return new;
end $$;
drop trigger if exists poker_tables_rate_limit on public.poker_tables;
create trigger poker_tables_rate_limit before insert on public.poker_tables
  for each row execute function public.poker_tables_rate_limit();

create or replace function public.poker_seats_rate_limit() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from public.poker_seats
      where player_id = new.player_id and created_at > now() - interval '1 day') >= 150 then
    raise exception 'too many seats today' using errcode = 'P0001';
  end if;
  return new;
end $$;
drop trigger if exists poker_seats_rate_limit on public.poker_seats;
create trigger poker_seats_rate_limit before insert on public.poker_seats
  for each row execute function public.poker_seats_rate_limit();

-- A new table, before anyone plays it: the host shares it first and plays like everyone else.
create or replace function public.poker_create_table(p_code text, p_rules text, p_seed bigint, p_player uuid, p_name text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.name_is_clean(p_name) then
    raise exception 'name not allowed' using errcode = 'P0001';
  end if;
  insert into public.poker_tables (code, rules, seed, host_id, host_name, max_attempts, closes_at)
    values (p_code, p_rules, p_seed, p_player, p_name, 10, now() + interval '24 hours');
end $$;

-- The first version: a new table with its host's game already played (no limits). Kept for old pages.
create or replace function public.poker_open_table(p_code text, p_rules text, p_seed bigint, p_player uuid, p_name text, p_score integer, p_moves text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.name_is_clean(p_name) then
    raise exception 'name not allowed' using errcode = 'P0001';
  end if;
  insert into public.poker_tables (code, rules, seed, host_id, host_name) values (p_code, p_rules, p_seed, p_player, p_name);
  insert into public.poker_seats (table_code, player_id, name, score, moves, finished_at)
    values (p_code, p_player, p_name, p_score, p_moves, now());
end $$;

-- Starting a try: takes the seat the first time and counts one more try after that. Returns the key
-- that sends this try's game (a new one each try, so only the last try can be sent).
create or replace function public.poker_sit(p_code text, p_player uuid, p_name text)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  k uuid := gen_random_uuid();
  t public.poker_tables;
begin
  if not public.name_is_clean(p_name) then
    raise exception 'name not allowed' using errcode = 'P0001';
  end if;
  select * into t from public.poker_tables where code = p_code and not hidden;
  if not found then
    raise exception 'no such table' using errcode = 'P0001';
  end if;
  if t.closes_at is not null and now() >= t.closes_at then
    raise exception 'table closed' using errcode = 'P0001';
  end if;
  if t.max_attempts is not null and exists (select 1 from public.poker_seats
      where table_code = p_code and player_id = p_player and attempts >= t.max_attempts) then
    raise exception 'no tries left' using errcode = 'P0001';
  end if;
  update public.poker_seats
    set attempts = attempts + 1, attempt_at = now(), attempt_open = true, seat_key = k, name = p_name
    where table_code = p_code and player_id = p_player and not hidden;
  if not found then
    insert into public.poker_seats (table_code, player_id, name, seat_key, attempt_open)
      values (p_code, p_player, p_name, k, true);
  end if;
  return k;
end $$;

-- Sending a try's game: once, and within an hour of starting it (so a try started before the table
-- closes still counts). Keeps it if it is the player's best, and notes the first try that beats the
-- host's best.
create or replace function public.poker_finish(p_key uuid, p_score integer, p_moves text)
returns void language plpgsql security definer set search_path = public as $$
declare
  s public.poker_seats;
  host_best integer;
  played bigint;
begin
  select * into s from public.poker_seats
    where seat_key = p_key and attempt_open and attempt_at > now() - interval '1 hour' for update;
  if not found then
    raise exception 'seat closed' using errcode = 'P0001';
  end if;
  played := s.played_ms + least(floor(extract(epoch from now() - s.attempt_at) * 1000)::bigint, 3600000);
  select h.score into host_best from public.poker_seats h join public.poker_tables t
    on t.code = h.table_code and h.player_id = t.host_id where t.code = s.table_code;
  update public.poker_seats set
    attempt_open = false,
    played_ms = played,
    score = case when s.score is null or p_score > s.score then p_score else s.score end,
    moves = case when s.score is null or p_score > s.score then p_moves else s.moves end,
    finished_at = case when s.score is null or p_score > s.score then now() else s.finished_at end,
    best_attempt = case when s.score is null or p_score > s.score then s.attempts else s.best_attempt end,
    beat_attempt = case when s.beat_attempt is null and host_best is not null and p_score > host_best
      and s.player_id <> (select host_id from public.poker_tables where code = s.table_code)
      then s.attempts else s.beat_attempt end,
    beat_ms = case when s.beat_attempt is null and host_best is not null and p_score > host_best
      and s.player_id <> (select host_id from public.poker_tables where code = s.table_code)
      then played else s.beat_ms end
    where id = s.id;
end $$;

revoke all on function public.poker_create_table(text, text, bigint, uuid, text) from public;
grant execute on function public.poker_create_table(text, text, bigint, uuid, text) to anon, authenticated;
revoke all on function public.poker_open_table(text, text, bigint, uuid, text, integer, text) from public;
revoke all on function public.poker_sit(text, uuid, text) from public;
revoke all on function public.poker_finish(uuid, integer, text) from public;
grant execute on function public.poker_open_table(text, text, bigint, uuid, text, integer, text) to anon, authenticated;
grant execute on function public.poker_sit(text, uuid, text) to anon, authenticated;
grant execute on function public.poker_finish(uuid, integer, text) to anon, authenticated;
