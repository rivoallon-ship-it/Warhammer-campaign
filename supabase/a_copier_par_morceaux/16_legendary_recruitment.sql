-- HexRealm - recrutement Dragon/Géant. Moins de 100 lignes pour Supabase.
alter table public.campaign_players add column if not exists dragon_recruits int not null default 0;
alter table public.campaign_players add column if not exists giant_recruits int not null default 0;
alter table public.campaign_players drop constraint if exists campaign_players_dragon_recruits_check;
alter table public.campaign_players add constraint campaign_players_dragon_recruits_check check (dragon_recruits >= 0);
alter table public.campaign_players drop constraint if exists campaign_players_giant_recruits_check;
alter table public.campaign_players add constraint campaign_players_giant_recruits_check check (giant_recruits >= 0);
alter table public.campaign_logs drop constraint if exists campaign_logs_type_check;
alter table public.campaign_logs add constraint campaign_logs_type_check check (type in ('campaign_created','player_joined','player_approved','campaign_launched','orders_revealed','battle_created','battle_result','exploration_result','territory_fortified','legendary_recruitment','turn_finished','season_finished','campaign_archived'));

create or replace function public.recruit_legendary_unit(target_campaign_id uuid, requested_unit_type text)
returns table (success boolean, error text, unit_type text, remaining_glory int, dragon_recruits int, giant_recruits int)
language plpgsql volatile security definer set search_path = public
as $recruit_legendary_unit$
declare
  v_type text := lower(trim(coalesce(requested_unit_type, '')));
  v_label text := case when lower(trim(coalesce(requested_unit_type, ''))) = 'dragon' then 'Dragon' else 'Géant' end;
  v_campaign_status text;
  v_turn_number int;
  v_player_id uuid;
  v_display_name text;
  v_glory int;
  v_turn_id uuid;
  v_owned_count int;
  v_remaining_glory int;
  v_dragon_recruits int;
  v_giant_recruits int;
begin
  if v_type not in ('dragon', 'giant') then
    return query select false, 'Type de recrutement invalide.', null::text, null::int, null::int, null::int;
    return;
  end if;

  for v_campaign_status, v_turn_number in
    select status, current_turn_number from public.campaigns where id = target_campaign_id for update
  loop exit; end loop;
  if v_campaign_status is null then
    return query select false, 'Campagne introuvable.', null::text, null::int, null::int, null::int;
    return;
  end if;
  if v_campaign_status <> 'active' then
    return query select false, 'La campagne doit être active pour recruter.', null::text, null::int, null::int, null::int;
    return;
  end if;

  for v_player_id, v_display_name, v_glory in
    select id, display_name, glory from public.campaign_players
    where campaign_id = target_campaign_id and user_id = auth.uid() and status = 'active' for update
  loop exit; end loop;
  if v_player_id is null then
    return query select false, 'Tu dois être joueur actif dans cette campagne.', null::text, null::int, null::int, null::int;
    return;
  end if;

  v_owned_count := (select count(*)::int from public.territories where campaign_id = target_campaign_id and owner_campaign_player_id = v_player_id and type = v_type);
  if v_owned_count <= 0 then
    return query select false, 'Tu dois contrôler un territoire ' || v_label || ' pour recruter.', null::text, null::int, null::int, null::int;
    return;
  end if;
  if v_glory < 10 then
    return query select false, 'Il faut 10 Gloire pour recruter.', null::text, null::int, null::int, null::int;
    return;
  end if;

  update public.campaign_players as player
  set glory = player.glory - 10,
      dragon_recruits = player.dragon_recruits + case when v_type = 'dragon' then 1 else 0 end,
      giant_recruits = player.giant_recruits + case when v_type = 'giant' then 1 else 0 end,
      updated_at = now()
  where player.id = v_player_id
  returning player.glory, player.dragon_recruits, player.giant_recruits
  into v_remaining_glory, v_dragon_recruits, v_giant_recruits;

  v_turn_id := (select id from public.campaign_turns where campaign_id = target_campaign_id and turn_number = v_turn_number order by started_at desc limit 1);
  insert into public.campaign_logs (campaign_id, turn_id, type, title, description, created_by_user_id)
  values (target_campaign_id, v_turn_id, 'legendary_recruitment', 'Recrutement légendaire', v_display_name || ' recrute un ' || v_label || ' pour 10 Gloire.', auth.uid());
  return query select true, null::text, v_type, v_remaining_glory, v_dragon_recruits, v_giant_recruits;
end;
$recruit_legendary_unit$;

grant execute on function public.recruit_legendary_unit(uuid, text) to authenticated;
