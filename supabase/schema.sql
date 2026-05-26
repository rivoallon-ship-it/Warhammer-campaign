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

create table if not exists public.territory_adjacencies (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  territory_code text not null,
  adjacent_territory_code text not null,
  created_at timestamptz not null default now(),
  unique (campaign_id, territory_code, adjacent_territory_code),
  check (territory_code <> adjacent_territory_code),
  foreign key (campaign_id, territory_code)
    references public.territories(campaign_id, code)
    on delete cascade,
  foreign key (campaign_id, adjacent_territory_code)
    references public.territories(campaign_id, code)
    on delete cascade
);

create table if not exists public.campaign_turns (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  season_number int not null default 1 check (season_number > 0),
  turn_number int not null check (turn_number > 0),
  phase text not null default 'orders',
  army_base_points int not null check (army_base_points > 0),
  event_name text,
  event_description text,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  unique (campaign_id, turn_number),
  check (phase in ('orders', 'revealed', 'resolving', 'end_turn', 'finished'))
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  turn_id uuid not null references public.campaign_turns(id) on delete cascade,
  campaign_player_id uuid not null references public.campaign_players(id) on delete cascade,
  action_type text not null,
  source_territory_id uuid references public.territories(id) on delete restrict,
  target_territory_id uuid references public.territories(id) on delete restrict,
  status text not null default 'draft',
  submitted_at timestamptz,
  revealed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (turn_id, campaign_player_id),
  check (action_type in ('attack', 'explore', 'fortify')),
  check (status in ('draft', 'submitted', 'revealed', 'resolved'))
);

create table if not exists public.battles (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  turn_id uuid not null references public.campaign_turns(id) on delete cascade,
  order_id uuid not null references public.orders(id) on delete cascade,
  territory_id uuid not null references public.territories(id) on delete restrict,
  attacker_campaign_player_id uuid not null references public.campaign_players(id) on delete cascade,
  defender_campaign_player_id uuid not null references public.campaign_players(id) on delete cascade,
  status text not null default 'pending',
  winner_campaign_player_id uuid references public.campaign_players(id) on delete set null,
  army_base_points int not null check (army_base_points > 0),
  defender_bonus text,
  result_notes text,
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  check (status in ('pending', 'played', 'cancelled')),
  check (
    winner_campaign_player_id is null
    or winner_campaign_player_id = attacker_campaign_player_id
    or winner_campaign_player_id = defender_campaign_player_id
  )
);

create table if not exists public.explorations (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  turn_id uuid not null references public.campaign_turns(id) on delete cascade,
  order_id uuid not null references public.orders(id) on delete cascade,
  campaign_player_id uuid not null references public.campaign_players(id) on delete cascade,
  territory_id uuid not null references public.territories(id) on delete restrict,
  status text not null default 'pending',
  dice_result int check (dice_result between 1 and 6),
  success boolean,
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  check (status in ('pending', 'resolved'))
);

create table if not exists public.campaign_logs (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  turn_id uuid references public.campaign_turns(id) on delete set null,
  type text not null,
  title text not null check (length(trim(title)) > 0),
  description text,
  created_by_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  check (
    type in (
      'campaign_created',
      'player_joined',
      'player_approved',
      'campaign_launched',
      'orders_revealed',
      'battle_created',
      'battle_result',
      'exploration_result',
      'territory_fortified',
      'turn_finished',
      'season_finished',
      'campaign_archived'
    )
  )
);

create index if not exists campaigns_owner_user_id_idx on public.campaigns(owner_user_id);
create index if not exists campaigns_invite_code_idx on public.campaigns(invite_code);
create index if not exists campaign_players_campaign_id_idx on public.campaign_players(campaign_id);
create index if not exists campaign_players_user_id_idx on public.campaign_players(user_id);
create index if not exists territories_campaign_id_idx on public.territories(campaign_id);
create index if not exists territory_adjacencies_campaign_id_idx on public.territory_adjacencies(campaign_id);
create index if not exists campaign_turns_campaign_id_idx on public.campaign_turns(campaign_id);
create index if not exists orders_campaign_id_idx on public.orders(campaign_id);
create index if not exists orders_turn_id_idx on public.orders(turn_id);
create index if not exists battles_campaign_id_idx on public.battles(campaign_id);
create index if not exists battles_turn_id_idx on public.battles(turn_id);
create index if not exists explorations_campaign_id_idx on public.explorations(campaign_id);
create index if not exists explorations_turn_id_idx on public.explorations(turn_id);
create index if not exists campaign_logs_campaign_id_created_at_idx on public.campaign_logs(campaign_id, created_at desc);

create unique index if not exists campaign_players_one_game_master_idx
  on public.campaign_players(campaign_id)
  where role = 'game_master' and status in ('pending', 'active');

create unique index if not exists campaign_players_active_color_idx
  on public.campaign_players(campaign_id, lower(color))
  where status = 'active' and color is not null;

create unique index if not exists campaign_players_active_capital_idx
  on public.campaign_players(campaign_id, upper(starting_capital_code))
  where status = 'active' and starting_capital_code is not null;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists campaigns_set_updated_at on public.campaigns;
create trigger campaigns_set_updated_at
before update on public.campaigns
for each row execute function public.set_updated_at();

drop trigger if exists campaign_players_set_updated_at on public.campaign_players;
create trigger campaign_players_set_updated_at
before update on public.campaign_players
for each row execute function public.set_updated_at();

drop trigger if exists territories_set_updated_at on public.territories;
create trigger territories_set_updated_at
before update on public.territories
for each row execute function public.set_updated_at();

drop trigger if exists orders_set_updated_at on public.orders;
create trigger orders_set_updated_at
before update on public.orders
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, avatar)
  values (
    new.id,
    coalesce(
      nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''),
      nullif(trim(new.raw_user_meta_data ->> 'name'), ''),
      split_part(new.email, '@', 1),
      'Joueur'
    ),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do update
    set display_name = excluded.display_name,
        avatar = coalesce(excluded.avatar, public.profiles.avatar),
        updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.is_campaign_owner(target_campaign_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.campaigns c
    where c.id = target_campaign_id
      and c.owner_user_id = auth.uid()
  );
$$;

create or replace function public.is_campaign_member(target_campaign_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.campaign_players cp
    where cp.campaign_id = target_campaign_id
      and cp.user_id = auth.uid()
      and cp.status in ('pending', 'active')
  );
$$;

create or replace function public.is_active_campaign_member(target_campaign_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.campaign_players cp
    where cp.campaign_id = target_campaign_id
      and cp.user_id = auth.uid()
      and cp.status = 'active'
  );
$$;

create or replace function public.is_campaign_master(target_campaign_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.campaign_players cp
    where cp.campaign_id = target_campaign_id
      and cp.user_id = auth.uid()
      and cp.role = 'game_master'
      and cp.status = 'active'
  );
$$;

create or replace function public.owns_campaign_player(target_campaign_player_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.campaign_players cp
    where cp.id = target_campaign_player_id
      and cp.user_id = auth.uid()
      and cp.status in ('pending', 'active')
  );
$$;

create or replace function public.campaign_player_keeps_identity(
  target_campaign_player_id uuid,
  target_campaign_id uuid,
  target_user_id uuid,
  target_role text,
  target_status text
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.campaign_players cp
    where cp.id = target_campaign_player_id
      and cp.campaign_id = target_campaign_id
      and cp.user_id = target_user_id
      and cp.role = target_role
      and cp.status = target_status
  );
$$;

alter table public.profiles enable row level security;
alter table public.campaigns enable row level security;
alter table public.campaign_players enable row level security;
alter table public.territories enable row level security;
alter table public.territory_adjacencies enable row level security;
alter table public.campaign_turns enable row level security;
alter table public.orders enable row level security;
alter table public.battles enable row level security;
alter table public.explorations enable row level security;
alter table public.campaign_logs enable row level security;

drop policy if exists "Profiles are readable by authenticated users" on public.profiles;
create policy "Profiles are readable by authenticated users"
on public.profiles for select
to authenticated
using (true);

drop policy if exists "Users insert their own profile" on public.profiles;
create policy "Users insert their own profile"
on public.profiles for insert
to authenticated
with check (id = auth.uid());

drop policy if exists "Users update their own profile" on public.profiles;
create policy "Users update their own profile"
on public.profiles for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

drop policy if exists "Campaigns readable by members and lobby seekers" on public.campaigns;
create policy "Campaigns readable by members and lobby seekers"
on public.campaigns for select
to authenticated
using (
  owner_user_id = auth.uid()
  or public.is_campaign_member(id)
  or status = 'lobby'
);

drop policy if exists "Users create owned campaigns" on public.campaigns;
create policy "Users create owned campaigns"
on public.campaigns for insert
to authenticated
with check (owner_user_id = auth.uid());

drop policy if exists "Owners and game masters update campaigns" on public.campaigns;
create policy "Owners and game masters update campaigns"
on public.campaigns for update
to authenticated
using (owner_user_id = auth.uid() or public.is_campaign_master(id))
with check (owner_user_id = auth.uid() or public.is_campaign_master(id));

drop policy if exists "Owners delete campaigns" on public.campaigns;
create policy "Owners delete campaigns"
on public.campaigns for delete
to authenticated
using (owner_user_id = auth.uid());

drop policy if exists "Campaign players readable by campaign context" on public.campaign_players;
create policy "Campaign players readable by campaign context"
on public.campaign_players for select
to authenticated
using (
  user_id = auth.uid()
  or public.is_campaign_member(campaign_id)
  or exists (
    select 1
    from public.campaigns c
    where c.id = campaign_id
      and c.status = 'lobby'
  )
);

drop policy if exists "Users join lobby campaigns or create their game master row" on public.campaign_players;
create policy "Users join lobby campaigns or create their game master row"
on public.campaign_players for insert
to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.campaigns c
    where c.id = campaign_id
      and c.status = 'lobby'
  )
  and (
    (role = 'player' and status = 'pending')
    or (role = 'game_master' and status = 'active' and public.is_campaign_owner(campaign_id))
  )
);

drop policy if exists "Players update their lobby settings" on public.campaign_players;
create policy "Players update their lobby settings"
on public.campaign_players for update
to authenticated
using (
  user_id = auth.uid()
  and exists (
    select 1
    from public.campaigns c
    where c.id = campaign_id
      and c.status = 'lobby'
  )
)
with check (
  user_id = auth.uid()
  and public.campaign_player_keeps_identity(id, campaign_id, user_id, role, status)
);

drop policy if exists "Game masters update campaign players" on public.campaign_players;
create policy "Game masters update campaign players"
on public.campaign_players for update
to authenticated
using (public.is_campaign_master(campaign_id))
with check (public.is_campaign_master(campaign_id));

drop policy if exists "Game masters delete campaign players" on public.campaign_players;
create policy "Game masters delete campaign players"
on public.campaign_players for delete
to authenticated
using (public.is_campaign_master(campaign_id));

drop policy if exists "Territories readable by campaign members" on public.territories;
create policy "Territories readable by campaign members"
on public.territories for select
to authenticated
using (public.is_campaign_member(campaign_id));

drop policy if exists "Game masters insert territories" on public.territories;
create policy "Game masters insert territories"
on public.territories for insert
to authenticated
with check (public.is_campaign_master(campaign_id));

drop policy if exists "Game masters update territories" on public.territories;
create policy "Game masters update territories"
on public.territories for update
to authenticated
using (public.is_campaign_master(campaign_id))
with check (public.is_campaign_master(campaign_id));

drop policy if exists "Game masters delete territories" on public.territories;
create policy "Game masters delete territories"
on public.territories for delete
to authenticated
using (public.is_campaign_master(campaign_id));

drop policy if exists "Adjacencies readable by campaign members" on public.territory_adjacencies;
create policy "Adjacencies readable by campaign members"
on public.territory_adjacencies for select
to authenticated
using (public.is_campaign_member(campaign_id));

drop policy if exists "Game masters insert adjacencies" on public.territory_adjacencies;
create policy "Game masters insert adjacencies"
on public.territory_adjacencies for insert
to authenticated
with check (public.is_campaign_master(campaign_id));

drop policy if exists "Game masters delete adjacencies" on public.territory_adjacencies;
create policy "Game masters delete adjacencies"
on public.territory_adjacencies for delete
to authenticated
using (public.is_campaign_master(campaign_id));

drop policy if exists "Turns readable by campaign members" on public.campaign_turns;
create policy "Turns readable by campaign members"
on public.campaign_turns for select
to authenticated
using (public.is_campaign_member(campaign_id));

drop policy if exists "Game masters insert turns" on public.campaign_turns;
create policy "Game masters insert turns"
on public.campaign_turns for insert
to authenticated
with check (public.is_campaign_master(campaign_id));

drop policy if exists "Game masters update turns" on public.campaign_turns;
create policy "Game masters update turns"
on public.campaign_turns for update
to authenticated
using (public.is_campaign_master(campaign_id))
with check (public.is_campaign_master(campaign_id));

drop policy if exists "Orders readable by owner before reveal and members after reveal" on public.orders;
create policy "Orders readable by owner before reveal and members after reveal"
on public.orders for select
to authenticated
using (
  public.owns_campaign_player(campaign_player_id)
  or (
    status in ('revealed', 'resolved')
    and public.is_active_campaign_member(campaign_id)
  )
);

drop policy if exists "Players insert their own orders" on public.orders;
create policy "Players insert their own orders"
on public.orders for insert
to authenticated
with check (
  public.owns_campaign_player(campaign_player_id)
  and public.is_active_campaign_member(campaign_id)
  and exists (
    select 1
    from public.campaigns c
    where c.id = campaign_id
      and c.current_phase = 'orders'
  )
);

drop policy if exists "Players update their own orders before reveal" on public.orders;
create policy "Players update their own orders before reveal"
on public.orders for update
to authenticated
using (
  public.owns_campaign_player(campaign_player_id)
  and status in ('draft', 'submitted')
)
with check (
  public.owns_campaign_player(campaign_player_id)
  and status in ('draft', 'submitted')
);

drop policy if exists "Game masters reveal and resolve orders" on public.orders;
create policy "Game masters reveal and resolve orders"
on public.orders for update
to authenticated
using (public.is_campaign_master(campaign_id))
with check (public.is_campaign_master(campaign_id));

drop policy if exists "Battles readable by active members" on public.battles;
create policy "Battles readable by active members"
on public.battles for select
to authenticated
using (public.is_active_campaign_member(campaign_id));

drop policy if exists "Game masters insert battles" on public.battles;
create policy "Game masters insert battles"
on public.battles for insert
to authenticated
with check (public.is_campaign_master(campaign_id));

drop policy if exists "Game masters update battles" on public.battles;
create policy "Game masters update battles"
on public.battles for update
to authenticated
using (public.is_campaign_master(campaign_id))
with check (public.is_campaign_master(campaign_id));

drop policy if exists "Explorations readable by active members" on public.explorations;
create policy "Explorations readable by active members"
on public.explorations for select
to authenticated
using (public.is_active_campaign_member(campaign_id));

drop policy if exists "Game masters insert explorations" on public.explorations;
create policy "Game masters insert explorations"
on public.explorations for insert
to authenticated
with check (public.is_campaign_master(campaign_id));

drop policy if exists "Game masters update explorations" on public.explorations;
create policy "Game masters update explorations"
on public.explorations for update
to authenticated
using (public.is_campaign_master(campaign_id))
with check (public.is_campaign_master(campaign_id));

drop policy if exists "Logs readable by campaign members" on public.campaign_logs;
create policy "Logs readable by campaign members"
on public.campaign_logs for select
to authenticated
using (public.is_campaign_member(campaign_id));

drop policy if exists "Owners and game masters insert logs" on public.campaign_logs;
create policy "Owners and game masters insert logs"
on public.campaign_logs for insert
to authenticated
with check (
  created_by_user_id = auth.uid()
  and (
    public.is_campaign_owner(campaign_id)
    or public.is_campaign_master(campaign_id)
  )
);

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.campaigns to authenticated;
grant select, insert, update, delete on public.campaign_players to authenticated;
grant select, insert, update, delete on public.territories to authenticated;
grant select, insert, update, delete on public.territory_adjacencies to authenticated;
grant select, insert, update, delete on public.campaign_turns to authenticated;
grant select, insert, update, delete on public.orders to authenticated;
grant select, insert, update, delete on public.battles to authenticated;
grant select, insert, update, delete on public.explorations to authenticated;
grant select, insert on public.campaign_logs to authenticated;

grant execute on function public.is_campaign_owner(uuid) to authenticated;
grant execute on function public.is_campaign_member(uuid) to authenticated;
grant execute on function public.is_active_campaign_member(uuid) to authenticated;
grant execute on function public.is_campaign_master(uuid) to authenticated;
grant execute on function public.owns_campaign_player(uuid) to authenticated;
grant execute on function public.campaign_player_keeps_identity(uuid, uuid, uuid, text, text) to authenticated;
