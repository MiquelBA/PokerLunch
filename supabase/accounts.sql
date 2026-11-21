-- Poker Lunch accounts (the app). Each player is a Supabase Auth user from the first launch: an
-- anonymous one, with no form (Authentication → Sign In / Providers → "Allow anonymous sign-ins" must
-- be on), that can later be linked to Apple or Google. The profile keeps what used to live only on the
-- phone: the name, the best score and the Poker Tour progress. Each player reads and writes only their own.
-- Applied to the shared project (the one Orca Lunch uses); reuses name_is_clean() from Orca Lunch's SQL.
-- Can be run again: it only adds what is missing and replaces the functions.

create table if not exists public.poker_profiles (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  name text check (name is null or (char_length(btrim(name)) between 1 and 16 and public.name_is_clean(name))),
  best integer not null default 0 check (best between 0 and 400000),
  -- The Tour progress, as the game saves it (engine/tour/progress.ts).
  tour jsonb not null default '{}'::jsonb check (jsonb_typeof(tour) = 'object' and pg_column_size(tour) < 20000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.poker_profiles_touch() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists poker_profiles_touch on public.poker_profiles;
create trigger poker_profiles_touch before update on public.poker_profiles
  for each row execute function public.poker_profiles_touch();

alter table public.poker_profiles enable row level security;
drop policy if exists "own profile: read" on public.poker_profiles;
create policy "own profile: read" on public.poker_profiles for select to authenticated using (user_id = auth.uid());
drop policy if exists "own profile: create" on public.poker_profiles;
create policy "own profile: create" on public.poker_profiles for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "own profile: change" on public.poker_profiles;
create policy "own profile: change" on public.poker_profiles for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

revoke all on public.poker_profiles from anon, authenticated;
grant select, insert on public.poker_profiles to authenticated;
grant update (name, best, tour) on public.poker_profiles to authenticated;

-- "Delete my account" (Apple requires it, anonymous accounts included): the player's scores, seats,
-- stats and comments go, the tables they opened stay for their friends without their name, and the
-- Auth user goes last (the profile with it).
create or replace function public.poker_delete_account() returns void
language plpgsql security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
begin
  if me is null then
    raise exception 'not signed in';
  end if;
  delete from public.scores where player_id = me;
  delete from public.poker_seats where player_id = me;
  update public.poker_tables set host_name = '—' where host_id = me;
  delete from public.events where device_id = me;
  delete from public.feedback where device_id = me;
  delete from auth.users where id = me;
end $$;
revoke all on function public.poker_delete_account() from public, anon;
grant execute on function public.poker_delete_account() to authenticated;
