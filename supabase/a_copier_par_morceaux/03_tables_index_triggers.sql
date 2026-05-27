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

