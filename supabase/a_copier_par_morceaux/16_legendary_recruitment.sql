-- HexRealm - recrutement Dragon/Géant contre 10 Gloire.
-- À lancer après les fichiers 01 à 15.

alter table public.campaign_players
add column if not exists dragon_recruits int not null default 0;

alter table public.campaign_players
add column if not exists giant_recruits int not null default 0;

alter table public.campaign_players
drop constraint if exists campaign_players_dragon_recruits_check;

alter table public.campaign_players
add constraint campaign_players_dragon_recruits_check
check (dragon_recruits >= 0);

alter table public.campaign_players
drop constraint if exists campaign_players_giant_recruits_check;

alter table public.campaign_players
add constraint campaign_players_giant_recruits_check
check (giant_recruits >= 0);

alter table public.campaign_logs
drop constraint if exists campaign_logs_type_check;

alter table public.campaign_logs
add constraint campaign_logs_type_check
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
    'legendary_recruitment',
    'turn_finished',
    'season_finished',
    'campaign_archived'
  )
);

create or replace function public.recruit_legendary_unit(
  target_campaign_id uuid,
  requested_unit_type text
)
returns table (
  success boolean,
  error text,
  unit_type text,
  remaining_glory int,
  dragon_recruits int,
  giant_recruits int
)
language plpgsql
volatile
security definer
set search_path = public
as $recruit_legendary_unit$
declare
  v_campaign public.campaigns%rowtype;
  v_player public.campaign_players%rowtype;
  v_turn public.campaign_turns%rowtype;
  v_unit_type text;
  v_unit_label text;
  v_owned_territory_count int := 0;
  v_remaining_glory int := 0;
  v_dragon_recruits int := 0;
  v_giant_recruits int := 0;
begin
  v_unit_type := lower(trim(coalesce(requested_unit_type, '')));

  if v_unit_type not in ('dragon', 'giant') then
    return query select false, 'Type de recrutement invalide.', null::text, null::int, null::int, null::int;
    return;
  end if;

  v_unit_label := case
    when v_unit_type = 'dragon' then 'Dragon'
    else 'Géant'
  end;

  select *
  into v_campaign
  from public.campaigns
  where id = target_campaign_id
  for update;

  if not found then
    return query select false, 'Campagne introuvable.', null::text, null::int, null::int, null::int;
    return;
  end if;

  if v_campaign.status <> 'active' then
    return query select false, 'La campagne doit être active pour recruter.', null::text, null::int, null::int, null::int;
    return;
  end if;

  select *
  into v_player
  from public.campaign_players
  where campaign_id = v_campaign.id
    and user_id = auth.uid()
    and status = 'active'
  for update;

  if not found then
    return query select false, 'Tu dois être joueur actif dans cette campagne.', null::text, null::int, null::int, null::int;
    return;
  end if;

  select count(*)::int
  into v_owned_territory_count
  from public.territories
  where campaign_id = v_campaign.id
    and owner_campaign_player_id = v_player.id
    and type = v_unit_type;

  if v_owned_territory_count <= 0 then
    return query select false, 'Tu dois contrôler un territoire ' || v_unit_label || ' pour recruter.', null::text, null::int, null::int, null::int;
    return;
  end if;

  if v_player.glory < 10 then
    return query select false, 'Il faut 10 Gloire pour recruter.', null::text, null::int, null::int, null::int;
    return;
  end if;

  update public.campaign_players
  set glory = glory - 10,
      dragon_recruits = dragon_recruits + case when v_unit_type = 'dragon' then 1 else 0 end,
      giant_recruits = giant_recruits + case when v_unit_type = 'giant' then 1 else 0 end,
      updated_at = now()
  where id = v_player.id
  returning glory, dragon_recruits, giant_recruits
  into v_remaining_glory, v_dragon_recruits, v_giant_recruits;

  select *
  into v_turn
  from public.campaign_turns
  where campaign_id = v_campaign.id
    and turn_number = v_campaign.current_turn_number
  order by started_at desc
  limit 1;

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
    'legendary_recruitment',
    'Recrutement légendaire',
    v_player.display_name || ' recrute un ' || v_unit_label || ' pour 10 Gloire.',
    auth.uid()
  );

  return query select true, null::text, v_unit_type, v_remaining_glory, v_dragon_recruits, v_giant_recruits;
end;
$recruit_legendary_unit$;

grant execute on function public.recruit_legendary_unit(uuid, text) to authenticated;
