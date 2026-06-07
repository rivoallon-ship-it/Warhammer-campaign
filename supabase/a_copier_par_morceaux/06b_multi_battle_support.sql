do $$
declare
  v_constraint_name text;
begin
  select conname into v_constraint_name
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
  dragon_recruits_committed int not null default 0 check (dragon_recruits_committed >= 0),
  giant_recruits_committed int not null default 0 check (giant_recruits_committed >= 0),
  created_at timestamptz not null default now(),
  unique (battle_id, campaign_player_id),
  check (role in ('attacker', 'defender', 'contender'))
);

create index if not exists battle_participants_battle_id_idx on public.battle_participants(battle_id);
create index if not exists battle_participants_campaign_id_idx on public.battle_participants(campaign_id);

alter table public.battle_participants enable row level security;

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

grant select, insert, update, delete on public.battle_participants to authenticated;
