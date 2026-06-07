drop function if exists public.resolve_battle_result(uuid, uuid, text);

create or replace function public.resolve_battle_result(target_battle_id uuid, submitted_winner_campaign_player_id uuid, submitted_result_notes text default null, submitted_legendary_losses jsonb default '[]'::jsonb)
returns table (success boolean, error text, winner_role text)
language plpgsql volatile security definer set search_path = public as $resolve_battle_result$
declare
  v_battle public.battles%rowtype; v_campaign public.campaigns%rowtype; v_turn public.campaign_turns%rowtype;
  v_territory public.territories%rowtype; v_winner public.campaign_players%rowtype; v_loss record;
  v_winner_role text; v_notes text; v_loss_name text; v_loss_summary text := ''; v_losses jsonb := coalesce(submitted_legendary_losses, '[]'::jsonb);
  v_dragon_losses int := 0; v_giant_losses int := 0;
  v_participant_count int := 0; v_loser_count int := 0; v_capital_bonus int := 0; v_ruins_bonus int := 0; v_legendary_bonus int := 0; v_winner_bonus int := 0; v_has_participants boolean := false;
begin
  if jsonb_typeof(v_losses) <> 'array' then return query select false, 'Format des pertes légendaires invalide.', null::text; return; end if;
  select * into v_battle from public.battles where id = target_battle_id for update;
  if not found then return query select false, 'Bataille introuvable.', null::text; return; end if;
  select * into v_campaign from public.campaigns where id = v_battle.campaign_id for update;
  if not found then return query select false, 'Campagne introuvable.', null::text; return; end if;
  if not public.is_campaign_master(v_campaign.id) then return query select false, 'Seul le maître de campagne peut résoudre une bataille.', null::text; return; end if;
  if v_campaign.status <> 'active' or v_campaign.current_phase <> 'resolving' then return query select false, 'La campagne doit être en phase de résolution.', null::text; return; end if;
  select * into v_turn from public.campaign_turns where id = v_battle.turn_id;
  if not found or v_turn.phase <> 'resolving' then return query select false, 'Le tour courant doit être en phase de résolution.', null::text; return; end if;
  if v_battle.status <> 'pending' then return query select false, 'Cette bataille est déjà résolue.', null::text; return; end if;
  select * into v_territory from public.territories where id = v_battle.territory_id;
  select * into v_winner from public.campaign_players where id = submitted_winner_campaign_player_id;
  if v_winner.id is null or v_territory.id is null then return query select false, 'Données de bataille incomplètes.', null::text; return; end if;
  select count(*) into v_participant_count from public.battle_participants where battle_id = v_battle.id;
  v_has_participants := v_participant_count > 0;
  if v_has_participants then
    select role into v_winner_role from public.battle_participants where battle_id = v_battle.id and campaign_player_id = submitted_winner_campaign_player_id limit 1;
    if not found then return query select false, 'Le vainqueur doit participer à cette bataille.', null::text; return; end if;
  else
    if submitted_winner_campaign_player_id is distinct from v_battle.attacker_campaign_player_id and submitted_winner_campaign_player_id is distinct from v_battle.defender_campaign_player_id then return query select false, 'Le vainqueur doit participer à cette bataille.', null::text; return; end if;
    v_winner_role := case when submitted_winner_campaign_player_id = v_battle.attacker_campaign_player_id then 'attacker' else 'defender' end; v_participant_count := 2;
  end if;
  for v_loss in select campaign_player_id, sum(coalesce(dragon_losses,0))::int dragon_losses, sum(coalesce(giant_losses,0))::int giant_losses, min(coalesce(dragon_losses,0)) min_dragon_losses, min(coalesce(giant_losses,0)) min_giant_losses from jsonb_to_recordset(v_losses) as x(campaign_player_id uuid, dragon_losses int, giant_losses int) group by campaign_player_id loop
    v_dragon_losses := coalesce(v_loss.dragon_losses, 0); v_giant_losses := coalesce(v_loss.giant_losses, 0); v_loss_name := null;
    if v_loss.campaign_player_id is null or v_loss.min_dragon_losses < 0 or v_loss.min_giant_losses < 0 then return query select false, 'Pertes légendaires invalides.', null::text; return; end if;
    if v_dragon_losses = 0 and v_giant_losses = 0 then continue; end if;
    if not v_has_participants then return query select false, 'Aucun renfort légendaire n''est engagé sur cette bataille.', null::text; return; end if;
    select cp.display_name into v_loss_name
    from public.battle_participants bp
    join public.campaign_players cp on cp.id = bp.campaign_player_id and cp.campaign_id = bp.campaign_id
    where bp.battle_id = v_battle.id and bp.campaign_player_id = v_loss.campaign_player_id
      and cp.dragon_recruits >= v_dragon_losses and cp.giant_recruits >= v_giant_losses
      and bp.dragon_recruits_committed >= v_dragon_losses and bp.giant_recruits_committed >= v_giant_losses
    for update of cp, bp;
    if v_loss_name is null then return query select false, 'Pertes légendaires supérieures aux renforts engagés ou au stock disponible.', null::text; return; end if;
  end loop;
  for v_loss in select campaign_player_id, sum(coalesce(dragon_losses,0))::int dragon_losses, sum(coalesce(giant_losses,0))::int giant_losses from jsonb_to_recordset(v_losses) as x(campaign_player_id uuid, dragon_losses int, giant_losses int) group by campaign_player_id loop
    v_dragon_losses := coalesce(v_loss.dragon_losses, 0); v_giant_losses := coalesce(v_loss.giant_losses, 0); v_loss_name := null;
    if v_dragon_losses = 0 and v_giant_losses = 0 then continue; end if;
    update public.campaign_players cp
    set dragon_recruits = cp.dragon_recruits - v_dragon_losses, giant_recruits = cp.giant_recruits - v_giant_losses, updated_at = now()
    where cp.id = v_loss.campaign_player_id
    returning cp.display_name into v_loss_name;
    v_loss_summary := v_loss_summary || ' ' || v_loss_name || ' perd' || case when v_dragon_losses > 0 then ' ' || v_dragon_losses || ' Dragon(s)' else '' end || case when v_giant_losses > 0 then ' ' || v_giant_losses || ' Géant(s)' else '' end || '.';
  end loop;
  v_loser_count := greatest(v_participant_count - 1, 0); v_notes := nullif(trim(coalesce(submitted_result_notes, '')), '');
  v_capital_bonus := case when v_territory.type = 'capital' and v_territory.owner_campaign_player_id is not null and submitted_winner_campaign_player_id is distinct from v_territory.owner_campaign_player_id and v_winner_role <> 'defender' then 5 else 0 end;
  v_ruins_bonus := case when v_territory.type = 'ruins' and v_territory.special_reward_claimed_at is null and submitted_winner_campaign_player_id is distinct from v_territory.owner_campaign_player_id then 1 else 0 end;
  v_legendary_bonus := case when v_territory.type in ('dragon', 'giant') and v_territory.owner_campaign_player_id is null and submitted_winner_campaign_player_id is distinct from v_territory.owner_campaign_player_id then 3 else 0 end;
  v_winner_bonus := case when v_winner_role = 'defender' then 2 else 3 end + v_capital_bonus + v_ruins_bonus + v_legendary_bonus;
  update public.battles set status = 'played', winner_campaign_player_id = submitted_winner_campaign_player_id, result_notes = v_notes, resolved_at = now() where id = v_battle.id;
  if exists (select 1 from public.battle_participants where battle_id = v_battle.id) then
    update public.campaign_players cp set glory = glory + case when cp.id = submitted_winner_campaign_player_id then v_winner_bonus else 1 end, updated_at = now() where exists (select 1 from public.battle_participants bp where bp.battle_id = v_battle.id and bp.campaign_player_id = cp.id);
  else
    update public.campaign_players set glory = glory + case when id = submitted_winner_campaign_player_id then v_winner_bonus else 1 end, updated_at = now() where id in (v_battle.attacker_campaign_player_id, v_battle.defender_campaign_player_id);
  end if;
  update public.territories set owner_campaign_player_id = submitted_winner_campaign_player_id, is_fortified = case when v_territory.is_fortified then false else is_fortified end, special_reward_claimed_at = case when v_ruins_bonus > 0 then now() else special_reward_claimed_at end, updated_at = now() where id = v_battle.territory_id;
  insert into public.campaign_logs (campaign_id, turn_id, type, title, description, created_by_user_id)
  values (v_battle.campaign_id, v_battle.turn_id, 'battle_result', 'Bataille résolue',
    v_winner.display_name || ' remporte la bataille pour ' || v_territory.code || ' - ' || v_territory.name || '. +' || v_winner_bonus || ' Gloire vainqueur' || case when v_capital_bonus > 0 then ' dont +5 pour capitale capturée' else '' end || case when v_ruins_bonus > 0 then ' dont +1 pour ruines' else '' end || case when v_legendary_bonus > 0 and v_territory.type = 'dragon' then ' dont +3 pour Dragon' when v_legendary_bonus > 0 and v_territory.type = 'giant' then ' dont +3 pour Géant' else '' end || case when v_loser_count > 0 then ', +1 Gloire pour chaque autre participant.' else '.' end || case when v_territory.is_fortified then ' La fortification est retirée.' else '' end || v_loss_summary || case when v_notes is not null then ' Notes : ' || v_notes else '' end,
    auth.uid());
  return query select true, null::text, v_winner_role;
end;
$resolve_battle_result$;

grant execute on function public.resolve_battle_result(uuid, uuid, text, jsonb) to authenticated;
