create or replace function public.is_campaign_member(target_campaign_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.campaign_players cp
    where cp.campaign_id = target_campaign_id
      and cp.user_id = auth.uid()
      and cp.status in ('pending', 'active')
  );
$$;

create or replace function public.is_campaign_master(target_campaign_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.campaign_players cp
    where cp.campaign_id = target_campaign_id
      and cp.user_id = auth.uid()
      and cp.role = 'game_master'
      and cp.status = 'active'
  );
$$;

alter table public.territories
  add column if not exists special_reward_claimed_at timestamptz;

alter table public.territories drop constraint if exists territories_type_check;
alter table public.territories
  add constraint territories_type_check
  check (type in ('capital', 'village', 'mine', 'ruins', 'fort', 'magic_tower', 'dragon', 'giant', 'wild'));

alter table public.campaign_turns
  drop constraint if exists campaign_turns_army_base_points_check;
alter table public.campaign_turns
  add constraint campaign_turns_army_base_points_check
  check (army_base_points >= 0);

alter table public.battles
  drop constraint if exists battles_army_base_points_check;
alter table public.battles
  add constraint battles_army_base_points_check
  check (army_base_points >= 0);

alter table public.territories enable row level security;
alter table public.territory_adjacencies enable row level security;
alter table public.campaign_turns enable row level security;

drop policy if exists "Game masters insert territories" on public.territories;
create policy "Game masters insert territories"
on public.territories for insert
to authenticated
with check (public.is_campaign_master(campaign_id));

drop policy if exists "Game masters insert adjacencies" on public.territory_adjacencies;
create policy "Game masters insert adjacencies"
on public.territory_adjacencies for insert
to authenticated
with check (public.is_campaign_master(campaign_id));

drop policy if exists "Game masters insert turns" on public.campaign_turns;
create policy "Game masters insert turns"
on public.campaign_turns for insert
to authenticated
with check (public.is_campaign_master(campaign_id));

grant select, insert, update, delete on public.territories to authenticated;
grant select, insert, update, delete on public.territory_adjacencies to authenticated;
grant select, insert, update, delete on public.campaign_turns to authenticated;
grant execute on function public.is_campaign_member(uuid) to authenticated;
grant execute on function public.is_campaign_master(uuid) to authenticated;
