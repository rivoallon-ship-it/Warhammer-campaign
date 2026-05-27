-- Les Couronnes Brisees - Supabase schema for the MVP.
-- Run this file in the Supabase SQL editor after creating the project.

create extension if not exists "pgcrypto";

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (length(trim(display_name)) > 0),
  avatar text,
  favorite_color text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  invite_code text not null unique check (length(trim(invite_code)) between 4 and 16),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'lobby',
  current_phase text not null default 'lobby',
  season_number int not null default 1 check (season_number > 0),
  current_turn_number int not null default 0 check (current_turn_number >= 0),
  player_count int not null check (player_count between 2 and 6),
  map_width int not null check (map_width > 0),
  map_height int not null check (map_height > 0),
  map_template text not null check (length(trim(map_template)) > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (status in ('lobby', 'active', 'season_end', 'finished', 'archived')),
  check (current_phase in ('lobby', 'orders', 'revealed', 'resolving', 'end_turn', 'season_summary', 'finished'))
);

create table if not exists public.campaign_players (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null check (length(trim(display_name)) > 0),
  aos_faction text,
  color text,
  role text not null default 'player',
  status text not null default 'pending',
  starting_capital_code text,
  glory int not null default 0 check (glory >= 0),
  is_ready boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (campaign_id, user_id),
  unique (campaign_id, id),
  check (role in ('player', 'game_master')),
  check (status in ('pending', 'active', 'rejected', 'left'))
);

create table if not exists public.territories (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  code text not null check (length(trim(code)) between 2 and 4),
  name text not null check (length(trim(name)) > 0),
  type text not null,
  position_x int not null check (position_x > 0),
  position_y int not null check (position_y > 0),
  owner_campaign_player_id uuid references public.campaign_players(id) on delete set null,
  is_fortified boolean not null default false,
  has_garrison boolean not null default false,
  local_faction text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (campaign_id, code),
  unique (campaign_id, position_x, position_y),
  check (type in ('capital', 'village', 'ruins', 'fort', 'magic_tower', 'dragon', 'giant', 'wild')),
  check (local_faction is null or local_faction in ('dragon', 'giant'))
);

