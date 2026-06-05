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
  check (action_type in ('conquer', 'fortify')),
  check (status in ('draft', 'submitted', 'revealed', 'resolved'))
);

do $$
declare
  v_constraint_name text;
begin
  select conname
  into v_constraint_name
  from pg_constraint
  where conrelid = 'public.orders'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) like '%action_type%'
  limit 1;

  if v_constraint_name is not null then
    execute format('alter table public.orders drop constraint %I', v_constraint_name);
  end if;

  update public.orders
  set action_type = 'conquer'
  where action_type in ('attack', 'explore');

  alter table public.orders
    add constraint orders_action_type_check
    check (action_type in ('conquer', 'fortify'));
end;
$$;

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
  check (status in ('pending', 'played', 'cancelled'))
);

do $$
declare
  v_constraint_name text;
begin
  select conname
  into v_constraint_name
  from pg_constraint
  where conrelid = 'public.battles'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) like '%winner_campaign_player_id%'
  limit 1;

  if v_constraint_name is not null then
    execute format('alter table public.battles drop constraint %I', v_constraint_name);
  end if;
end;
$$;

create table if not exists public.battle_participants (
  id uuid primary key default gen_random_uuid(),
  battle_id uuid not null references public.battles(id) on delete cascade,
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  campaign_player_id uuid not null references public.campaign_players(id) on delete cascade,
  order_id uuid references public.orders(id) on delete set null,
  role text not null default 'contender',
  dice_result int check (dice_result between 1 and 6),
  advantage_rank int check (advantage_rank is null or advantage_rank > 0),
  created_at timestamptz not null default now(),
  unique (battle_id, campaign_player_id),
  check (role in ('attacker', 'defender', 'contender'))
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
create index if not exists battle_participants_battle_id_idx on public.battle_participants(battle_id);
create index if not exists battle_participants_campaign_id_idx on public.battle_participants(campaign_id);
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

insert into public.profiles (id, display_name, avatar)
select
  u.id,
  coalesce(
    nullif(trim(u.raw_user_meta_data ->> 'display_name'), ''),
    nullif(trim(u.raw_user_meta_data ->> 'name'), ''),
    split_part(u.email, '@', 1),
    'Joueur'
  ),
  u.raw_user_meta_data ->> 'avatar_url'
from auth.users u
on conflict (id) do nothing;

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

create or replace function public.normalize_invite_code(raw_value text)
returns text
language sql
immutable
set search_path = public
as $$
  select upper(regexp_replace(trim(coalesce(raw_value, '')), '[[:space:]-]+', '', 'g'));
$$;

create or replace function public.campaign_capital_slots(target_player_count int)
returns text[]
language sql
immutable
set search_path = public
as $$
  select case target_player_count
    when 2 then array['A1', 'D5']::text[]
    when 3 then array['A1', 'A6', 'E3']::text[]
    when 4 then array['A1', 'A7', 'E1', 'E7']::text[]
    when 5 then array['A1', 'A8', 'F1', 'F8', 'C4']::text[]
    when 6 then array['A1', 'A9', 'F1', 'F9', 'C4', 'D6']::text[]
    else array[]::text[]
  end;
$$;

create or replace function public.get_join_campaign_details(
  target_invite_code text
)
returns table (
  success boolean,
  error text,
  campaign jsonb,
  players jsonb
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_invite_code text;
  v_campaign public.campaigns%rowtype;
  v_players jsonb := '[]'::jsonb;
begin
  if auth.uid() is null then
    return query select false, 'Connexion requise.', null::jsonb, '[]'::jsonb;
    return;
  end if;

  v_invite_code := public.normalize_invite_code(target_invite_code);

  if v_invite_code = '' then
    return query select false, 'Saisis un code invitation.', null::jsonb, '[]'::jsonb;
    return;
  end if;

  select *
  into v_campaign
  from public.campaigns c
  where c.invite_code = v_invite_code;

  if not found then
    return query select false, 'Aucune campagne ne correspond à ce code.', null::jsonb, '[]'::jsonb;
    return;
  end if;

  if v_campaign.status <> 'lobby' and not public.is_campaign_member(v_campaign.id) then
    return query select false, 'Cette campagne n''est plus en lobby.', null::jsonb, '[]'::jsonb;
    return;
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', cp.id,
        'display_name', cp.display_name,
        'aos_faction', cp.aos_faction,
        'color', cp.color,
        'status', cp.status,
        'starting_capital_code', cp.starting_capital_code,
        'is_current_user', cp.user_id = auth.uid()
      )
      order by cp.created_at
    ),
    '[]'::jsonb
  )
  into v_players
  from public.campaign_players cp
  where cp.campaign_id = v_campaign.id
    and cp.status in ('pending', 'active');

  return query select
    true,
    null::text,
    jsonb_build_object(
      'id', v_campaign.id,
      'name', v_campaign.name,
      'invite_code', v_campaign.invite_code,
      'status', v_campaign.status,
      'current_phase', v_campaign.current_phase,
      'season_number', v_campaign.season_number,
      'current_turn_number', v_campaign.current_turn_number,
      'player_count', v_campaign.player_count,
      'map_width', v_campaign.map_width,
      'map_height', v_campaign.map_height,
      'map_template', v_campaign.map_template,
      'created_at', v_campaign.created_at,
      'updated_at', v_campaign.updated_at
    ),
    v_players;
end;
$$;

create or replace function public.request_join_campaign(
  target_invite_code text,
  submitted_display_name text,
  submitted_aos_faction text,
  submitted_color text,
  submitted_starting_capital_code text
)
returns table (
  success boolean,
  error text,
  campaign_id uuid
)
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_invite_code text;
  v_display_name text;
  v_aos_faction text;
  v_color text;
  v_normalized_color text;
  v_starting_capital_code text;
  v_campaign public.campaigns%rowtype;
  v_existing_player public.campaign_players%rowtype;
  v_reserved_player_count int := 0;
begin
  if auth.uid() is null then
    return query select false, 'Connexion requise.', null::uuid;
    return;
  end if;

  v_invite_code := public.normalize_invite_code(target_invite_code);
  v_display_name := regexp_replace(trim(coalesce(submitted_display_name, '')), '[[:space:]]+', ' ', 'g');
  v_aos_faction := regexp_replace(trim(coalesce(submitted_aos_faction, '')), '[[:space:]]+', ' ', 'g');
  v_color := trim(coalesce(submitted_color, ''));
  v_normalized_color := lower(v_color);
  v_starting_capital_code := upper(trim(coalesce(submitted_starting_capital_code, '')));

  if v_invite_code = '' then
    return query select false, 'Le code invitation est obligatoire.', null::uuid;
    return;
  end if;

  if v_display_name = '' then
    return query select false, 'Le pseudo est obligatoire.', null::uuid;
    return;
  end if;

  if v_aos_faction = '' then
    return query select false, 'La faction est obligatoire.', null::uuid;
    return;
  end if;

  if v_color = '' then
    return query select false, 'Choisis une couleur.', null::uuid;
    return;
  end if;

  if v_normalized_color not in (
    '#b84b35',
    '#2f6f9f',
    '#3f7d4b',
    '#7251a5',
    '#a77b24',
    '#302720'
  ) then
    return query select false, 'Cette couleur n''est pas disponible.', null::uuid;
    return;
  end if;

  if v_starting_capital_code = '' then
    return query select false, 'Choisis une capitale.', null::uuid;
    return;
  end if;

  select *
  into v_campaign
  from public.campaigns c
  where c.invite_code = v_invite_code
  for update;

  if not found then
    return query select false, 'Aucune campagne ne correspond à ce code.', null::uuid;
    return;
  end if;

  if v_campaign.status <> 'lobby' then
    return query select false, 'Cette campagne n''est plus en lobby.', null::uuid;
    return;
  end if;

  select *
  into v_existing_player
  from public.campaign_players cp
  where cp.campaign_id = v_campaign.id
    and cp.user_id = auth.uid()
  limit 1;

  if found then
    if v_existing_player.status in ('pending', 'active') then
      return query select true, null::text, v_campaign.id;
      return;
    end if;

    return query select false, 'Tu as déjà une entrée dans cette campagne.', null::uuid;
    return;
  end if;

  select count(*)
  into v_reserved_player_count
  from public.campaign_players cp
  where cp.campaign_id = v_campaign.id
    and cp.status in ('pending', 'active');

  if v_reserved_player_count >= v_campaign.player_count then
    return query select false, 'Cette campagne est pleine ou toutes les places sont demandées.', null::uuid;
    return;
  end if;

  if not (v_starting_capital_code = any(public.campaign_capital_slots(v_campaign.player_count))) then
    return query select false, 'Cette capitale n''est pas autorisée pour cette carte.', null::uuid;
    return;
  end if;

  if exists (
    select 1
    from public.campaign_players cp
    where cp.campaign_id = v_campaign.id
      and cp.status in ('pending', 'active')
      and lower(cp.color) = v_normalized_color
  ) then
    return query select false, 'Cette couleur est déjà prise.', null::uuid;
    return;
  end if;

  if exists (
    select 1
    from public.campaign_players cp
    where cp.campaign_id = v_campaign.id
      and cp.status in ('pending', 'active')
      and upper(cp.starting_capital_code) = v_starting_capital_code
  ) then
    return query select false, 'Cette capitale est déjà prise.', null::uuid;
    return;
  end if;

  insert into public.campaign_players (
    campaign_id,
    user_id,
    display_name,
    aos_faction,
    color,
    role,
    status,
    starting_capital_code,
    glory,
    is_ready
  )
  values (
    v_campaign.id,
    auth.uid(),
    v_display_name,
    v_aos_faction,
    v_color,
    'player',
    'pending',
    v_starting_capital_code,
    0,
    false
  );

  insert into public.campaign_logs (
    campaign_id,
    type,
    title,
    description,
    created_by_user_id
  )
  values (
    v_campaign.id,
    'player_joined',
    'Demande envoyée',
    v_display_name || ' a demandé à rejoindre la campagne.',
    auth.uid()
  );

  return query select true, null::text, v_campaign.id;
end;
$$;

create or replace function public.get_current_turn_order_visibility(
  target_campaign_id uuid
)
returns table (
  campaign_player_id uuid,
  display_name text,
  order_id uuid,
  order_status text,
  can_view_details boolean,
  action_type text,
  source_territory_id uuid,
  source_territory_code text,
  target_territory_id uuid,
  target_territory_code text,
  submitted_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  with campaign_context as (
    select c.*
    from public.campaigns c
    where c.id = target_campaign_id
      and public.is_active_campaign_member(c.id)
  ),
  current_turn as (
    select ct.*
    from public.campaign_turns ct
    join campaign_context c on c.id = ct.campaign_id
    where ct.turn_number = c.current_turn_number
    order by ct.started_at desc
    limit 1
  ),
  visible_orders as (
    select
      o.*,
      (
        public.owns_campaign_player(o.campaign_player_id)
        or o.status in ('revealed', 'resolved')
      ) as can_view_details
    from public.orders o
    join current_turn ct on ct.id = o.turn_id
  )
  select
    cp.id as campaign_player_id,
    cp.display_name,
    vo.id as order_id,
    coalesce(vo.status, 'pending') as order_status,
    coalesce(vo.can_view_details, false) as can_view_details,
    case when vo.can_view_details then vo.action_type else null end as action_type,
    case
      when vo.can_view_details then vo.source_territory_id
      else null
    end as source_territory_id,
    case when vo.can_view_details then source.code else null end as source_territory_code,
    case
      when vo.can_view_details then vo.target_territory_id
      else null
    end as target_territory_id,
    case when vo.can_view_details then target.code else null end as target_territory_code,
    case when vo.can_view_details then vo.submitted_at else null end as submitted_at
  from campaign_context c
  join public.campaign_players cp
    on cp.campaign_id = c.id
    and cp.status = 'active'
  left join visible_orders vo on vo.campaign_player_id = cp.id
  left join public.territories source on source.id = vo.source_territory_id
  left join public.territories target on target.id = vo.target_territory_id
  order by cp.created_at asc;
$$;

create or replace function public.reveal_current_turn_orders(
  target_campaign_id uuid
)
returns table (
  success boolean,
  error text,
  battle_count int,
  exploration_count int,
  fortification_count int,
  multiple_attack_count int
)
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_campaign public.campaigns%rowtype;
  v_turn public.campaign_turns%rowtype;
  v_active_count int := 0;
  v_submitted_count int := 0;
  v_battle_count int := 0;
  v_enemy_battle_count int := 0;
  v_contested_battle_count int := 0;
  v_exploration_count int := 0;
  v_fortification_count int := 0;
  v_multiple_attack_count int := 0;
  v_next_turn_number int;
  v_next_army_base_points int;
begin
  select *
  into v_campaign
  from public.campaigns
  where id = target_campaign_id
  for update;

  if not found then
    return query select false, 'Campagne introuvable.', 0, 0, 0, 0;
    return;
  end if;

  if not public.is_active_campaign_member(v_campaign.id) then
    return query select false, 'Tu dois être joueur actif pour révéler les ordres.', 0, 0, 0, 0;
    return;
  end if;

  if v_campaign.status <> 'active' or v_campaign.current_phase <> 'orders' then
    return query select false, 'Les ordres ne peuvent pas être révélés dans cette phase.', 0, 0, 0, 0;
    return;
  end if;

  select *
  into v_turn
  from public.campaign_turns
  where campaign_id = v_campaign.id
    and turn_number = v_campaign.current_turn_number
  order by started_at desc
  limit 1;

  if not found or v_turn.phase <> 'orders' then
    return query select false, 'Le tour courant n''est pas en phase ordres.', 0, 0, 0, 0;
    return;
  end if;

  select count(*)
  into v_active_count
  from public.campaign_players
  where campaign_id = v_campaign.id
    and status = 'active';

  select count(distinct o.campaign_player_id)
  into v_submitted_count
  from public.orders o
  join public.campaign_players cp on cp.id = o.campaign_player_id
  where o.campaign_id = v_campaign.id
    and o.turn_id = v_turn.id
    and o.status = 'submitted'
    and cp.status = 'active';

  if v_active_count = 0 or v_submitted_count <> v_active_count then
    return query select false, 'Tous les joueurs actifs doivent avoir validé leur ordre.', 0, 0, 0, 0;
    return;
  end if;

  if exists (
    select 1
    from public.orders o
    left join public.territories source on source.id = o.source_territory_id
    left join public.territories target on target.id = o.target_territory_id
    left join public.territory_adjacencies adjacency
      on adjacency.campaign_id = o.campaign_id
      and adjacency.territory_code = source.code
      and adjacency.adjacent_territory_code = target.code
    where o.campaign_id = v_campaign.id
      and o.turn_id = v_turn.id
      and o.status = 'submitted'
      and (
        (
          o.action_type = 'conquer'
          and (
            source.id is null
            or target.id is null
            or source.owner_campaign_player_id is distinct from o.campaign_player_id
            or adjacency.id is null
            or target.owner_campaign_player_id = o.campaign_player_id
          )
        )
        or (
          o.action_type = 'fortify'
          and (
            target.id is null
            or target.owner_campaign_player_id is distinct from o.campaign_player_id
          )
        )
      )
  ) then
    return query select false, 'Certains ordres ne sont plus valides. Demande aux joueurs concernés de les modifier.', 0, 0, 0, 0;
    return;
  end if;

  select count(*)
  into v_multiple_attack_count
  from (
    select o.target_territory_id
    from public.orders o
    join public.territories target on target.id = o.target_territory_id
    where o.campaign_id = v_campaign.id
      and o.turn_id = v_turn.id
      and o.status = 'submitted'
      and (
        o.action_type = 'conquer'
      )
    group by o.target_territory_id
    having count(*) > 1
  ) contested_targets;

  select count(*)
  into v_enemy_battle_count
  from public.orders o
  where o.campaign_id = v_campaign.id
    and o.turn_id = v_turn.id
    and o.status = 'submitted'
    and o.action_type = 'conquer'
    and exists (
      select 1
      from public.territories target
      where target.id = o.target_territory_id
        and target.owner_campaign_player_id is not null
    );

  with inserted_battles as (
    insert into public.battles (
      campaign_id,
      turn_id,
      order_id,
      territory_id,
      attacker_campaign_player_id,
      defender_campaign_player_id,
      army_base_points,
      defender_bonus
    )
    select
      o.campaign_id,
      o.turn_id,
      o.id,
      target.id,
      o.campaign_player_id,
      target.owner_campaign_player_id,
      v_turn.army_base_points,
      case
        when target.is_fortified then 'Fortification : défenseur +1 point de commandement au round 1.'
        else null
      end
    from public.orders o
    join public.territories target on target.id = o.target_territory_id
    where o.campaign_id = v_campaign.id
      and o.turn_id = v_turn.id
      and o.status = 'submitted'
      and o.action_type = 'conquer'
      and target.owner_campaign_player_id is not null
    returning id, campaign_id, order_id, attacker_campaign_player_id, defender_campaign_player_id
  )
  insert into public.battle_participants (
    battle_id,
    campaign_id,
    campaign_player_id,
    order_id,
    role
  )
  select id, campaign_id, attacker_campaign_player_id, order_id, 'attacker'
  from inserted_battles
  union all
  select id, campaign_id, defender_campaign_player_id, null, 'defender'
  from inserted_battles;

  select count(*)
  into v_contested_battle_count
  from (
    select o.target_territory_id
    from public.orders o
    join public.territories target on target.id = o.target_territory_id
    where o.campaign_id = v_campaign.id
      and o.turn_id = v_turn.id
      and o.status = 'submitted'
      and o.action_type = 'conquer'
      and target.owner_campaign_player_id is null
    group by o.target_territory_id
    having count(*) > 1
  ) contested_neutral_targets;

  with neutral_order_counts as (
    select o.target_territory_id, count(*) as order_count
    from public.orders o
    join public.territories target on target.id = o.target_territory_id
    where o.campaign_id = v_campaign.id
      and o.turn_id = v_turn.id
      and o.status = 'submitted'
      and o.action_type = 'conquer'
      and target.owner_campaign_player_id is null
    group by o.target_territory_id
  ),
  contested_orders as (
    select
      o.id as order_id,
      o.campaign_id,
      o.turn_id,
      o.campaign_player_id,
      o.target_territory_id as territory_id,
      o.submitted_at,
      roll.dice_result
    from public.orders o
    join neutral_order_counts noc on noc.target_territory_id = o.target_territory_id
    cross join lateral (
      select (floor(random() * 6)::int + 1) as dice_result
      where o.id is not null
    ) roll
    where o.campaign_id = v_campaign.id
      and o.turn_id = v_turn.id
      and o.status = 'submitted'
      and o.action_type = 'conquer'
      and noc.order_count > 1
  ),
  ranked_contenders as (
    select
      *,
      row_number() over (
        partition by territory_id
        order by dice_result desc, submitted_at asc nulls last, order_id asc
      ) as advantage_rank
    from contested_orders
  ),
  battle_seed as (
    select
      campaign_id,
      turn_id,
      territory_id,
      (array_agg(order_id order by advantage_rank))[1] as order_id,
      (array_agg(campaign_player_id order by advantage_rank))[1] as first_player_id,
      (array_agg(campaign_player_id order by advantage_rank))[2] as second_player_id
    from ranked_contenders
    group by campaign_id, turn_id, territory_id
  ),
  inserted_battles as (
    insert into public.battles (
      campaign_id,
      turn_id,
      order_id,
      territory_id,
      attacker_campaign_player_id,
      defender_campaign_player_id,
      army_base_points
    )
    select
      campaign_id,
      turn_id,
      order_id,
      territory_id,
      first_player_id,
      second_player_id,
      v_turn.army_base_points
    from battle_seed
    returning id, campaign_id, territory_id
  )
  insert into public.battle_participants (
    battle_id,
    campaign_id,
    campaign_player_id,
    order_id,
    role,
    dice_result,
    advantage_rank
  )
  select
    inserted_battles.id,
    ranked_contenders.campaign_id,
    ranked_contenders.campaign_player_id,
    ranked_contenders.order_id,
    'contender',
    ranked_contenders.dice_result,
    ranked_contenders.advantage_rank
  from ranked_contenders
  join inserted_battles on inserted_battles.territory_id = ranked_contenders.territory_id;

  select count(*)
  into v_exploration_count
  from public.orders o
  join public.territories target on target.id = o.target_territory_id
  where o.campaign_id = v_campaign.id
    and o.turn_id = v_turn.id
    and o.status = 'submitted'
    and o.action_type = 'conquer'
    and target.owner_campaign_player_id is null
    and not exists (
      select 1
      from public.orders rival
      where rival.campaign_id = o.campaign_id
        and rival.turn_id = o.turn_id
        and rival.status = 'submitted'
        and rival.action_type = 'conquer'
        and rival.target_territory_id = o.target_territory_id
        and rival.id <> o.id
    );

  with single_orders as (
    select
      o.id as order_id,
      o.campaign_id,
      o.turn_id,
      o.campaign_player_id,
      target.id as territory_id,
      target.code as territory_code,
      target.name as territory_name,
      roll.dice_result,
      roll.dice_result >= 3 as exploration_success
    from public.orders o
    join public.territories target on target.id = o.target_territory_id
    cross join lateral (
      select (floor(random() * 6)::int + 1) as dice_result
      where o.id is not null
    ) roll
    where o.campaign_id = v_campaign.id
      and o.turn_id = v_turn.id
      and o.status = 'submitted'
      and o.action_type = 'conquer'
      and target.owner_campaign_player_id is null
      and not exists (
        select 1
        from public.orders rival
        where rival.campaign_id = o.campaign_id
          and rival.turn_id = o.turn_id
          and rival.status = 'submitted'
          and rival.action_type = 'conquer'
          and rival.target_territory_id = o.target_territory_id
          and rival.id <> o.id
      )
  ),
  inserted_explorations as (
    insert into public.explorations as inserted_exploration (
      campaign_id,
      turn_id,
      order_id,
      campaign_player_id,
      territory_id,
      status,
      dice_result,
      success,
      resolved_at
    )
    select
      single_orders.campaign_id,
      single_orders.turn_id,
      single_orders.order_id,
      single_orders.campaign_player_id,
      single_orders.territory_id,
      'resolved',
      single_orders.dice_result,
      single_orders.exploration_success,
      now()
    from single_orders
    returning
      inserted_exploration.campaign_id,
      inserted_exploration.turn_id,
      inserted_exploration.campaign_player_id,
      inserted_exploration.territory_id,
      inserted_exploration.dice_result,
      inserted_exploration.success as exploration_success
  ),
  glory_updates as (
    update public.campaign_players cp
    set glory = glory + 1,
        updated_at = now()
    from inserted_explorations ie
    where cp.id = ie.campaign_player_id
    returning cp.id
  ),
  territory_updates as (
    update public.territories target
    set owner_campaign_player_id = ie.campaign_player_id,
        updated_at = now()
    from inserted_explorations ie
    where target.id = ie.territory_id
      and ie.exploration_success
    returning target.id
  )
  insert into public.campaign_logs (
    campaign_id,
    turn_id,
    type,
    title,
    description,
    created_by_user_id
  )
  select
    ie.campaign_id,
    ie.turn_id,
    'exploration_result',
    case when ie.exploration_success then 'Conquête réussie' else 'Conquête échouée' end,
    cp.display_name || ' tente de conquérir ' || target.code || ' - '
      || target.name || ' : '
      || case when ie.exploration_success then 'réussite' else 'échec' end
      || ' sur un D6 automatique de ' || ie.dice_result || '. +1 Gloire.',
    auth.uid()
  from inserted_explorations ie
  join public.campaign_players cp on cp.id = ie.campaign_player_id
  join public.territories target on target.id = ie.territory_id;

  v_battle_count := v_enemy_battle_count + v_contested_battle_count;

  update public.territories target
  set is_fortified = true,
      updated_at = now()
  from public.orders o
  where target.id = o.target_territory_id
    and o.campaign_id = v_campaign.id
    and o.turn_id = v_turn.id
    and o.status = 'submitted'
    and o.action_type = 'fortify';

  get diagnostics v_fortification_count = row_count;

  insert into public.campaign_logs (
    campaign_id,
    turn_id,
    type,
    title,
    description,
    created_by_user_id
  )
  select
    o.campaign_id,
    o.turn_id,
    'territory_fortified',
    'Territoire fortifié',
    cp.display_name || ' fortifie ' || target.code || ' - ' || target.name || '.',
    auth.uid()
  from public.orders o
  join public.campaign_players cp on cp.id = o.campaign_player_id
  join public.territories target on target.id = o.target_territory_id
  where o.campaign_id = v_campaign.id
    and o.turn_id = v_turn.id
    and o.status = 'submitted'
    and o.action_type = 'fortify';

  update public.orders
  set status = 'revealed',
      revealed_at = now()
  where campaign_id = v_campaign.id
    and turn_id = v_turn.id
    and status = 'submitted';

  insert into public.campaign_logs (
    campaign_id,
    turn_id,
    type,
    title,
    description,
    created_by_user_id
  )
  values (
    v_campaign.id,
    v_turn.id,
    'orders_revealed',
    'Ordres révélés',
    'Révélation : ' || v_battle_count || ' bataille(s), '
      || v_exploration_count || ' conquête(s) automatique(s), '
      || v_fortification_count || ' fortification(s).'
      || case
        when v_multiple_attack_count > 0
          then ' Attention : ' || v_multiple_attack_count || ' territoire(s) déclenchent un conflit multiple.'
        else ''
      end,
    auth.uid()
  );

  if v_battle_count = 0 then
    v_next_turn_number := v_campaign.current_turn_number + 1;
    v_next_army_base_points := least(400 + greatest(v_next_turn_number - 1, 0) * 200, 2000);

    update public.orders
    set status = 'resolved'
    where campaign_id = v_campaign.id
      and turn_id = v_turn.id
      and status = 'revealed';

    update public.campaign_turns
    set phase = 'finished',
        ended_at = now()
    where id = v_turn.id;

    insert into public.campaign_turns (
      campaign_id,
      season_number,
      turn_number,
      phase,
      army_base_points
    )
    values (
      v_campaign.id,
      v_campaign.season_number,
      v_next_turn_number,
      'orders',
      v_next_army_base_points
    )
    on conflict (campaign_id, turn_number) do update
      set phase = 'orders',
          army_base_points = excluded.army_base_points,
          ended_at = null;

    update public.campaigns
    set current_turn_number = v_next_turn_number,
        current_phase = 'orders',
        updated_at = now()
    where id = v_campaign.id;

    insert into public.campaign_logs (
      campaign_id,
      turn_id,
      type,
      title,
      description,
      created_by_user_id
    )
    values (
      v_campaign.id,
      v_turn.id,
      'turn_finished',
      'Tour terminé automatiquement',
      'Aucune bataille à résoudre. Le tour ' || v_campaign.current_turn_number
        || ' est terminé automatiquement. Le tour '
        || v_next_turn_number || ' commence avec '
        || v_next_army_base_points || ' points d''armée.',
      auth.uid()
    );
  else
    update public.campaign_turns
    set phase = 'resolving'
    where id = v_turn.id;

    update public.campaigns
    set current_phase = 'resolving',
        updated_at = now()
    where id = v_campaign.id;
  end if;

  return query select true, null::text, v_battle_count, v_exploration_count, v_fortification_count, v_multiple_attack_count;
end;
$$;

create or replace function public.resolve_exploration_result(
  target_exploration_id uuid,
  submitted_dice_result int
)
returns table (
  success boolean,
  error text,
  exploration_success boolean
)
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_exploration public.explorations%rowtype;
  v_campaign public.campaigns%rowtype;
  v_turn public.campaign_turns%rowtype;
  v_player public.campaign_players%rowtype;
  v_territory public.territories%rowtype;
  v_success boolean;
begin
  if submitted_dice_result < 1 or submitted_dice_result > 6 then
    return query select false, 'Le résultat doit être un D6 entre 1 et 6.', null::boolean;
    return;
  end if;

  select *
  into v_exploration
  from public.explorations
  where id = target_exploration_id;

  if not found then
    return query select false, 'Exploration introuvable.', null::boolean;
    return;
  end if;

  select *
  into v_campaign
  from public.campaigns
  where id = v_exploration.campaign_id;

  if not found then
    return query select false, 'Campagne introuvable.', null::boolean;
    return;
  end if;

  if not public.is_campaign_master(v_campaign.id) then
    return query select false, 'Seul le maître de campagne peut résoudre une exploration.', null::boolean;
    return;
  end if;

  if v_campaign.status <> 'active' or v_campaign.current_phase <> 'resolving' then
    return query select false, 'La campagne doit être en phase de résolution.', null::boolean;
    return;
  end if;

  select *
  into v_turn
  from public.campaign_turns
  where id = v_exploration.turn_id;

  if not found or v_turn.phase <> 'resolving' then
    return query select false, 'Le tour courant doit être en phase de résolution.', null::boolean;
    return;
  end if;

  if v_exploration.status <> 'pending' then
    return query select false, 'Cette exploration est déjà résolue.', null::boolean;
    return;
  end if;

  select *
  into v_player
  from public.campaign_players
  where id = v_exploration.campaign_player_id;

  if not found then
    return query select false, 'Joueur introuvable.', null::boolean;
    return;
  end if;

  select *
  into v_territory
  from public.territories
  where id = v_exploration.territory_id;

  if not found then
    return query select false, 'Territoire introuvable.', null::boolean;
    return;
  end if;

  v_success := submitted_dice_result >= 3;

  update public.explorations
  set dice_result = submitted_dice_result,
      success = v_success,
      status = 'resolved',
      resolved_at = now()
  where id = v_exploration.id;

  update public.campaign_players
  set glory = glory + 1,
      updated_at = now()
  where id = v_exploration.campaign_player_id;

  if v_success then
    update public.territories
    set owner_campaign_player_id = v_exploration.campaign_player_id,
        updated_at = now()
    where id = v_exploration.territory_id;
  end if;

  insert into public.campaign_logs (
    campaign_id,
    turn_id,
    type,
    title,
    description,
    created_by_user_id
  )
  values (
    v_exploration.campaign_id,
    v_exploration.turn_id,
    'exploration_result',
    case when v_success then 'Exploration réussie' else 'Exploration échouée' end,
    v_player.display_name || ' explore ' || v_territory.code || ' - '
      || v_territory.name || ' : '
      || case
        when v_success then 'réussite'
        else 'échec'
      end
      || ' sur un D6 de ' || submitted_dice_result || '. +1 Gloire.',
    auth.uid()
  );

  return query select true, null::text, v_success;
end;
$$;

create or replace function public.resolve_battle_result(
  target_battle_id uuid,
  submitted_winner_campaign_player_id uuid,
  submitted_result_notes text default null
)
returns table (
  success boolean,
  error text,
  winner_role text
)
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_battle public.battles%rowtype;
  v_campaign public.campaigns%rowtype;
  v_turn public.campaign_turns%rowtype;
  v_territory public.territories%rowtype;
  v_winner public.campaign_players%rowtype;
  v_winner_role text;
  v_notes text;
  v_participant_count int := 0;
  v_loser_count int := 0;
begin
  select *
  into v_battle
  from public.battles
  where id = target_battle_id
  for update;

  if not found then
    return query select false, 'Bataille introuvable.', null::text;
    return;
  end if;

  select *
  into v_campaign
  from public.campaigns
  where id = v_battle.campaign_id
  for update;

  if not found then
    return query select false, 'Campagne introuvable.', null::text;
    return;
  end if;

  if not public.is_campaign_master(v_campaign.id) then
    return query select false, 'Seul le maître de campagne peut résoudre une bataille.', null::text;
    return;
  end if;

  if v_campaign.status <> 'active' or v_campaign.current_phase <> 'resolving' then
    return query select false, 'La campagne doit être en phase de résolution.', null::text;
    return;
  end if;

  select *
  into v_turn
  from public.campaign_turns
  where id = v_battle.turn_id;

  if not found or v_turn.phase <> 'resolving' then
    return query select false, 'Le tour courant doit être en phase de résolution.', null::text;
    return;
  end if;

  if v_battle.status <> 'pending' then
    return query select false, 'Cette bataille est déjà résolue.', null::text;
    return;
  end if;

  select *
  into v_territory
  from public.territories
  where id = v_battle.territory_id;

  select *
  into v_winner
  from public.campaign_players
  where id = submitted_winner_campaign_player_id;

  if v_winner.id is null or v_territory.id is null then
    return query select false, 'Données de bataille incomplètes.', null::text;
    return;
  end if;

  select count(*)
  into v_participant_count
  from public.battle_participants
  where battle_id = v_battle.id;

  if v_participant_count > 0 then
    select role
    into v_winner_role
    from public.battle_participants
    where battle_id = v_battle.id
      and campaign_player_id = submitted_winner_campaign_player_id
    limit 1;

    if not found then
      return query select false, 'Le vainqueur doit participer à cette bataille.', null::text;
      return;
    end if;
  else
    if submitted_winner_campaign_player_id is distinct from v_battle.attacker_campaign_player_id
      and submitted_winner_campaign_player_id is distinct from v_battle.defender_campaign_player_id then
      return query select false, 'Le vainqueur doit participer à cette bataille.', null::text;
      return;
    end if;

    v_winner_role := case
      when submitted_winner_campaign_player_id = v_battle.attacker_campaign_player_id then 'attacker'
      else 'defender'
    end;
    v_participant_count := 2;
  end if;

  v_loser_count := greatest(v_participant_count - 1, 0);
  v_notes := nullif(trim(coalesce(submitted_result_notes, '')), '');

  update public.battles
  set status = 'played',
      winner_campaign_player_id = submitted_winner_campaign_player_id,
      result_notes = v_notes,
      resolved_at = now()
  where id = v_battle.id;

  if exists (select 1 from public.battle_participants where battle_id = v_battle.id) then
    update public.campaign_players cp
    set glory = glory + case
          when cp.id = submitted_winner_campaign_player_id and v_winner_role = 'defender' then 2
          when cp.id = submitted_winner_campaign_player_id then 3
          else 1
        end,
        updated_at = now()
    where exists (
      select 1
      from public.battle_participants bp
      where bp.battle_id = v_battle.id
        and bp.campaign_player_id = cp.id
    );
  else
    update public.campaign_players
    set glory = glory + case
          when id = submitted_winner_campaign_player_id and v_winner_role = 'defender' then 2
          when id = submitted_winner_campaign_player_id then 3
          else 1
        end,
        updated_at = now()
    where id in (
      v_battle.attacker_campaign_player_id,
      v_battle.defender_campaign_player_id
    );
  end if;

  update public.territories
  set owner_campaign_player_id = submitted_winner_campaign_player_id,
      is_fortified = case
        when v_battle.defender_bonus is not null then false
        else is_fortified
      end,
      updated_at = now()
  where id = v_battle.territory_id;

  insert into public.campaign_logs (
    campaign_id,
    turn_id,
    type,
    title,
    description,
    created_by_user_id
  )
  values (
    v_battle.campaign_id,
    v_battle.turn_id,
    'battle_result',
    'Bataille résolue',
    v_winner.display_name || ' remporte la bataille pour '
      || v_territory.code || ' - ' || v_territory.name || '. +'
      || case when v_winner_role = 'defender' then 2 else 3 end
      || ' Gloire vainqueur'
      || case
        when v_loser_count > 0 then ', +1 Gloire pour chaque autre participant.'
        else '.'
      end
    || case
      when v_battle.defender_bonus is not null then ' La fortification est retirée.'
      else ''
    end
    || case
      when v_notes is not null then ' Notes : ' || v_notes
      else ''
    end,
    auth.uid()
  );

  return query select true, null::text, v_winner_role;
end;
$$;

create or replace function public.finish_current_turn(
  target_campaign_id uuid
)
returns table (
  success boolean,
  error text,
  next_turn_number int,
  next_army_base_points int
)
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_campaign public.campaigns%rowtype;
  v_turn public.campaign_turns%rowtype;
  v_unresolved_explorations int := 0;
  v_unresolved_battles int := 0;
  v_next_turn_number int;
  v_next_army_base_points int;
begin
  select *
  into v_campaign
  from public.campaigns
  where id = target_campaign_id
  for update;

  if not found then
    return query select false, 'Campagne introuvable.', null::int, null::int;
    return;
  end if;

  if not public.is_campaign_master(v_campaign.id) then
    return query select false, 'Seul le maître de campagne peut terminer le tour.', null::int, null::int;
    return;
  end if;

  if v_campaign.status <> 'active' or v_campaign.current_phase not in ('resolving', 'end_turn') then
    return query select false, 'La campagne doit être en phase de résolution.', null::int, null::int;
    return;
  end if;

  select *
  into v_turn
  from public.campaign_turns
  where campaign_id = v_campaign.id
    and turn_number = v_campaign.current_turn_number
  order by started_at desc
  limit 1;

  if not found or v_turn.phase not in ('resolving', 'end_turn') then
    return query select false, 'Le tour courant doit être en phase de résolution.', null::int, null::int;
    return;
  end if;

  select count(*)
  into v_unresolved_explorations
  from public.explorations
  where campaign_id = v_campaign.id
    and turn_id = v_turn.id
    and status <> 'resolved';

  select count(*)
  into v_unresolved_battles
  from public.battles
  where campaign_id = v_campaign.id
    and turn_id = v_turn.id
    and status not in ('played', 'cancelled');

  if v_unresolved_explorations > 0 or v_unresolved_battles > 0 then
    return query select false, 'Toutes les explorations et batailles doivent être résolues.', null::int, null::int;
    return;
  end if;

  v_next_turn_number := v_campaign.current_turn_number + 1;
  v_next_army_base_points := least(400 + greatest(v_next_turn_number - 1, 0) * 200, 2000);

  update public.orders
  set status = 'resolved'
  where campaign_id = v_campaign.id
    and turn_id = v_turn.id
    and status = 'revealed';

  update public.campaign_turns
  set phase = 'finished',
      ended_at = now()
  where id = v_turn.id;

  insert into public.campaign_turns (
    campaign_id,
    season_number,
    turn_number,
    phase,
    army_base_points
  )
  values (
    v_campaign.id,
    v_campaign.season_number,
    v_next_turn_number,
    'orders',
    v_next_army_base_points
  )
  on conflict (campaign_id, turn_number) do update
    set phase = 'orders',
        army_base_points = excluded.army_base_points,
        ended_at = null;

  update public.campaigns
  set current_turn_number = v_next_turn_number,
      current_phase = 'orders',
      updated_at = now()
  where id = v_campaign.id;

  insert into public.campaign_logs (
    campaign_id,
    turn_id,
    type,
    title,
    description,
    created_by_user_id
  )
  values (
    v_campaign.id,
    v_turn.id,
    'turn_finished',
    'Tour terminé',
    'Le tour ' || v_campaign.current_turn_number || ' est terminé. Le tour '
      || v_next_turn_number || ' commence avec '
      || v_next_army_base_points || ' points d''armée.',
    auth.uid()
  );

  return query select true, null::text, v_next_turn_number, v_next_army_base_points;
end;
$$;

alter table public.profiles enable row level security;
alter table public.campaigns enable row level security;
alter table public.campaign_players enable row level security;
alter table public.territories enable row level security;
alter table public.territory_adjacencies enable row level security;
alter table public.campaign_turns enable row level security;
alter table public.orders enable row level security;
alter table public.battles enable row level security;
alter table public.battle_participants enable row level security;
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
drop policy if exists "Campaigns readable by members" on public.campaigns;
create policy "Campaigns readable by members"
on public.campaigns for select
to authenticated
using (
  owner_user_id = auth.uid()
  or public.is_campaign_member(id)
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
drop policy if exists "Campaign players readable by campaign members" on public.campaign_players;
create policy "Campaign players readable by campaign members"
on public.campaign_players for select
to authenticated
using (
  user_id = auth.uid()
  or public.is_campaign_member(campaign_id)
);

drop policy if exists "Users join lobby campaigns or create their game master row" on public.campaign_players;
drop policy if exists "Users create their game master row" on public.campaign_players;
create policy "Users create their game master row"
on public.campaign_players for insert
to authenticated
with check (
  user_id = auth.uid()
  and role = 'game_master'
  and status = 'active'
  and public.is_campaign_owner(campaign_id)
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

drop policy if exists "Battle participants readable by active members" on public.battle_participants;
create policy "Battle participants readable by active members"
on public.battle_participants for select
to authenticated
using (public.is_active_campaign_member(campaign_id));

drop policy if exists "Game masters insert battle participants" on public.battle_participants;
create policy "Game masters insert battle participants"
on public.battle_participants for insert
to authenticated
with check (public.is_campaign_master(campaign_id));

drop policy if exists "Game masters update battle participants" on public.battle_participants;
create policy "Game masters update battle participants"
on public.battle_participants for update
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

drop policy if exists "Campaign members insert join logs" on public.campaign_logs;
create policy "Campaign members insert join logs"
on public.campaign_logs for insert
to authenticated
with check (
  created_by_user_id = auth.uid()
  and type = 'player_joined'
  and public.is_campaign_member(campaign_id)
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
grant select, insert, update, delete on public.battle_participants to authenticated;
grant select, insert, update, delete on public.explorations to authenticated;
grant select, insert on public.campaign_logs to authenticated;

grant execute on function public.is_campaign_owner(uuid) to authenticated;
grant execute on function public.is_campaign_member(uuid) to authenticated;
grant execute on function public.is_active_campaign_member(uuid) to authenticated;
grant execute on function public.is_campaign_master(uuid) to authenticated;
grant execute on function public.owns_campaign_player(uuid) to authenticated;
grant execute on function public.campaign_player_keeps_identity(uuid, uuid, uuid, text, text) to authenticated;
grant execute on function public.normalize_invite_code(text) to authenticated;
grant execute on function public.campaign_capital_slots(int) to authenticated;
grant execute on function public.get_join_campaign_details(text) to authenticated;
grant execute on function public.request_join_campaign(text, text, text, text, text) to authenticated;
grant execute on function public.get_current_turn_order_visibility(uuid) to authenticated;
grant execute on function public.reveal_current_turn_orders(uuid) to authenticated;
grant execute on function public.resolve_exploration_result(uuid, int) to authenticated;
grant execute on function public.resolve_battle_result(uuid, uuid, text) to authenticated;
grant execute on function public.finish_current_turn(uuid) to authenticated;
