-- Poker Lunch: tables (taules). One player plays a board and invites others; everyone plays the same
-- board once and the table keeps everyone's score and moves (the moves draw the "ghosts" in the game).
-- A seat is taken when the game starts and filled in when it ends, so leaving halfway spends the try.
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
  -- Empty while the game is being played (or if it was left halfway).
  score integer check (score between 0 and 10000000),
  moves text check (char_length(moves) <= 4000 and moves ~ '^[a-zA-Z0-9.,]*$'),
  finished_at timestamptz,
  -- Only the phone that sat knows it: it fills the seat in. Never readable.
  seat_key uuid not null default gen_random_uuid(),
  hidden boolean not null default false,
  check ((finished_at is null) = (score is null) and (score is null) = (moves is null)),
  -- One try per player at each table.
  unique (table_code, player_id)
);
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
grant select (id, created_at, table_code, player_id, name, score, moves, finished_at, hidden) on public.poker_seats to anon, authenticated;

-- Limits: 30 new tables and 150 seats per player a day.
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

-- A new table with its host's game already played (the host plays before sharing).
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

-- Taking a seat when the game starts. Returns the key that fills it in; a second seat for the same
-- player fails (unique violation: HTTP 409).
create or replace function public.poker_sit(p_code text, p_player uuid, p_name text)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  k uuid;
begin
  if not public.name_is_clean(p_name) then
    raise exception 'name not allowed' using errcode = 'P0001';
  end if;
  if not exists (select 1 from public.poker_tables where code = p_code and not hidden) then
    raise exception 'no such table' using errcode = 'P0001';
  end if;
  insert into public.poker_seats (table_code, player_id, name) values (p_code, p_player, p_name)
    returning seat_key into k;
  return k;
end $$;

-- Filling the seat in at the end of the game: once, and within an hour of sitting.
create or replace function public.poker_finish(p_key uuid, p_score integer, p_moves text)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.poker_seats set score = p_score, moves = p_moves, finished_at = now()
    where seat_key = p_key and finished_at is null and created_at > now() - interval '1 hour';
  if not found then
    raise exception 'seat closed' using errcode = 'P0001';
  end if;
end $$;

revoke all on function public.poker_open_table(text, text, bigint, uuid, text, integer, text) from public;
revoke all on function public.poker_sit(text, uuid, text) from public;
revoke all on function public.poker_finish(uuid, integer, text) from public;
grant execute on function public.poker_open_table(text, text, bigint, uuid, text, integer, text) to anon, authenticated;
grant execute on function public.poker_sit(text, uuid, text) to anon, authenticated;
grant execute on function public.poker_finish(uuid, integer, text) to anon, authenticated;
