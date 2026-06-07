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
  army_base_points int not null check (army_base_points >= 0),
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
  army_base_points int not null check (army_base_points >= 0),
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
