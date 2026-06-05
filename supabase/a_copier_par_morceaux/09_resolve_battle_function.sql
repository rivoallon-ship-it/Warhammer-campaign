create or replace function public.resolve_battle_result(target_battle_id uuid, submitted_winner_campaign_player_id uuid, submitted_result_notes text default null)
returns table (success boolean, error text, winner_role text)
language plpgsql volatile security definer set search_path = public as $$
declare
  v_battle public.battles%rowtype; v_campaign public.campaigns%rowtype; v_turn public.campaign_turns%rowtype;
  v_territory public.territories%rowtype; v_winner public.campaign_players%rowtype;
  v_winner_role text; v_notes text; v_participant_count int := 0; v_loser_count int := 0;
  v_capital_glory_bonus int := 0; v_ruins_glory_bonus int := 0; v_winner_glory_bonus int := 0;
begin
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
  if v_participant_count > 0 then
    select role into v_winner_role from public.battle_participants where battle_id = v_battle.id and campaign_player_id = submitted_winner_campaign_player_id limit 1;
    if not found then return query select false, 'Le vainqueur doit participer à cette bataille.', null::text; return; end if;
  else
    if submitted_winner_campaign_player_id is distinct from v_battle.attacker_campaign_player_id and submitted_winner_campaign_player_id is distinct from v_battle.defender_campaign_player_id then return query select false, 'Le vainqueur doit participer à cette bataille.', null::text; return; end if;
    v_winner_role := case when submitted_winner_campaign_player_id = v_battle.attacker_campaign_player_id then 'attacker' else 'defender' end;
    v_participant_count := 2;
  end if;
  v_loser_count := greatest(v_participant_count - 1, 0);
  v_notes := nullif(trim(coalesce(submitted_result_notes, '')), '');
  v_capital_glory_bonus := case when v_territory.type = 'capital' and v_territory.owner_campaign_player_id is not null and submitted_winner_campaign_player_id is distinct from v_territory.owner_campaign_player_id and v_winner_role <> 'defender' then 5 else 0 end;
  v_ruins_glory_bonus := case when v_territory.type = 'ruins' and v_territory.special_reward_claimed_at is null and submitted_winner_campaign_player_id is distinct from v_territory.owner_campaign_player_id then 1 else 0 end;
  v_winner_glory_bonus := case when v_winner_role = 'defender' then 2 else 3 end + v_capital_glory_bonus + v_ruins_glory_bonus;
  update public.battles set status = 'played', winner_campaign_player_id = submitted_winner_campaign_player_id, result_notes = v_notes, resolved_at = now() where id = v_battle.id;
  if exists (select 1 from public.battle_participants where battle_id = v_battle.id) then
    update public.campaign_players cp set glory = glory + case when cp.id = submitted_winner_campaign_player_id then v_winner_glory_bonus else 1 end, updated_at = now()
    where exists (select 1 from public.battle_participants bp where bp.battle_id = v_battle.id and bp.campaign_player_id = cp.id);
  else
    update public.campaign_players set glory = glory + case when id = submitted_winner_campaign_player_id then v_winner_glory_bonus else 1 end, updated_at = now()
    where id in (v_battle.attacker_campaign_player_id, v_battle.defender_campaign_player_id);
  end if;
  update public.territories set owner_campaign_player_id = submitted_winner_campaign_player_id, is_fortified = case when v_territory.is_fortified then false else is_fortified end, special_reward_claimed_at = case when v_ruins_glory_bonus > 0 then now() else special_reward_claimed_at end, updated_at = now() where id = v_battle.territory_id;
  insert into public.campaign_logs (campaign_id, turn_id, type, title, description, created_by_user_id)
  values (v_battle.campaign_id, v_battle.turn_id, 'battle_result', 'Bataille résolue',
    v_winner.display_name || ' remporte la bataille pour ' || v_territory.code || ' - ' || v_territory.name || '. +' || v_winner_glory_bonus || ' Gloire vainqueur' || case when v_capital_glory_bonus > 0 then ' dont +5 pour capitale capturée' else '' end || case when v_ruins_glory_bonus > 0 then ' dont +1 pour ruines' else '' end || case when v_loser_count > 0 then ', +1 Gloire pour chaque autre participant.' else '.' end
    || case when v_territory.is_fortified then ' La fortification est retirée.' else '' end
    || case when v_notes is not null then ' Notes : ' || v_notes else '' end, auth.uid());
  return query select true, null::text, v_winner_role;
end;
$$;
