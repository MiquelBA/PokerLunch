-- Poker Lunch: tables (taules). One player plays a board and invites others; everyone plays the same
-- board once and the table keeps everyone's score and moves (the moves draw the "ghosts" in the game).
-- Applied to the shared project (the one Orca Lunch uses). Reuses name_is_clean() from Orca Lunch's SQL.

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
  score integer not null check (score between 0 and 10000000),
  moves text not null check (char_length(moves) <= 4000 and moves ~ '^[a-zA-Z0-9.,]*$'),
  hidden boolean not null default false,
  -- Only a player's first game at a table counts.
  unique (table_code, player_id)
);
create index if not exists poker_seats_player on public.poker_seats (player_id, created_at);
create index if not exists poker_tables_host on public.poker_tables (host_id, created_at);

alter table public.poker_tables enable row level security;
alter table public.poker_seats enable row level security;

drop policy if exists "anyone reads tables" on public.poker_tables;
create policy "anyone reads tables" on public.poker_tables for select to anon, authenticated using (not hidden);
drop policy if exists "anyone opens a table" on public.poker_tables;
create policy "anyone opens a table" on public.poker_tables for insert to anon, authenticated
  with check (public.name_is_clean(host_name) and not hidden);

drop policy if exists "anyone reads seats" on public.poker_seats;
create policy "anyone reads seats" on public.poker_seats for select to anon, authenticated using (not hidden);
drop policy if exists "anyone takes a seat" on public.poker_seats;
create policy "anyone takes a seat" on public.poker_seats for insert to anon, authenticated
  with check (public.name_is_clean(name) and not hidden);

grant select, insert on public.poker_tables to anon, authenticated;
grant select, insert on public.poker_seats to anon, authenticated;

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
