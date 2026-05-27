create or replace function public.resolve_battle_result(target_battle_id uuid, submitted_winner_campaign_player_id uuid, submitted_result_notes text default null)
returns table (success boolean, error text, winner_role text)
language plpgsql volatile security definer set search_path = public as $$
declare
  v_battle public.battles%rowtype;
  v_campaign public.campaigns%rowtype;
  v_turn public.campaign_turns%rowtype;
  v_attacker public.campaign_players%rowtype;
  v_defender public.campaign_players%rowtype;
  v_territory public.territories%rowtype;
  v_attacker_wins boolean;
  v_winner_role text;
  v_notes text;
begin
  select * into v_battle from public.battles where id = target_battle_id;
  if not found then return query select false, 'Bataille introuvable.', null::text; return; end if;
  select * into v_campaign from public.campaigns where id = v_battle.campaign_id;
  if not found then return query select false, 'Campagne introuvable.', null::text; return; end if;
  if not public.is_campaign_master(v_campaign.id) then return query select false, 'Seul le maître de campagne peut résoudre une bataille.', null::text; return; end if;
  if v_campaign.status <> 'active' or v_campaign.current_phase <> 'resolving' then return query select false, 'La campagne doit être en phase de résolution.', null::text; return; end if;
  select * into v_turn from public.campaign_turns where id = v_battle.turn_id;
  if not found or v_turn.phase <> 'resolving' then return query select false, 'Le tour courant doit être en phase de résolution.', null::text; return; end if;
  if v_battle.status <> 'pending' then return query select false, 'Cette bataille est déjà résolue.', null::text; return; end if;
  if submitted_winner_campaign_player_id is distinct from v_battle.attacker_campaign_player_id and submitted_winner_campaign_player_id is distinct from v_battle.defender_campaign_player_id then return query select false, 'Le vainqueur doit être l''attaquant ou le défenseur.', null::text; return; end if;
  select * into v_attacker from public.campaign_players where id = v_battle.attacker_campaign_player_id;
  select * into v_defender from public.campaign_players where id = v_battle.defender_campaign_player_id;
  select * into v_territory from public.territories where id = v_battle.territory_id;
  if v_attacker.id is null or v_defender.id is null or v_territory.id is null then return query select false, 'Données de bataille incomplètes.', null::text; return; end if;
  v_attacker_wins := submitted_winner_campaign_player_id = v_battle.attacker_campaign_player_id;
  v_winner_role := case when v_attacker_wins then 'attacker' else 'defender' end;
  v_notes := nullif(trim(coalesce(submitted_result_notes, '')), '');
  update public.battles set status = 'played', winner_campaign_player_id = submitted_winner_campaign_player_id, result_notes = v_notes, resolved_at = now() where id = v_battle.id;
  update public.campaign_players set glory = glory + case when v_attacker_wins and id = v_battle.attacker_campaign_player_id then 3 when v_attacker_wins and id = v_battle.defender_campaign_player_id then 1 when not v_attacker_wins and id = v_battle.defender_campaign_player_id then 2 when not v_attacker_wins and id = v_battle.attacker_campaign_player_id then 1 else 0 end, updated_at = now()
  where id in (v_battle.attacker_campaign_player_id, v_battle.defender_campaign_player_id);
  update public.territories set owner_campaign_player_id = case when v_attacker_wins then v_battle.attacker_campaign_player_id else owner_campaign_player_id end, is_fortified = case when v_battle.defender_bonus is not null then false else is_fortified end, updated_at = now()
  where id = v_battle.territory_id;
  insert into public.campaign_logs (campaign_id, turn_id, type, title, description, created_by_user_id)
  values (v_battle.campaign_id, v_battle.turn_id, 'battle_result', 'Bataille résolue',
    case when v_attacker_wins then v_attacker.display_name || ' conquiert ' || v_territory.code || ' - ' || v_territory.name || ' contre ' || v_defender.display_name || '. +3 Gloire attaquant, +1 Gloire défenseur.'
    else v_defender.display_name || ' défend ' || v_territory.code || ' - ' || v_territory.name || ' contre ' || v_attacker.display_name || '. +2 Gloire défenseur, +1 Gloire attaquant.' end
    || case when v_battle.defender_bonus is not null then ' La fortification est retirée.' else '' end
    || case when v_notes is not null then ' Notes : ' || v_notes else '' end,
    auth.uid());
  return query select true, null::text, v_winner_role;
end;
$$;
