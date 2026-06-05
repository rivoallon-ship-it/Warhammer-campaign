create or replace function public.reveal_current_turn_orders(target_campaign_id uuid)
returns table (success boolean, error text, battle_count int, exploration_count int, fortification_count int, multiple_attack_count int)
language plpgsql volatile security definer set search_path = public as $$
declare
  v_campaign public.campaigns%rowtype; v_turn public.campaign_turns%rowtype;
  v_active_count int := 0; v_submitted_count int := 0; v_battle_count int := 0;
  v_enemy_battle_count int := 0; v_contested_battle_count int := 0;
  v_exploration_count int := 0; v_fortification_count int := 0; v_multiple_attack_count int := 0;
  v_next_turn_number int; v_next_army_base_points int;
begin
  select * into v_campaign from public.campaigns where id = target_campaign_id for update;
  if not found then return query select false, 'Campagne introuvable.', 0, 0, 0, 0; return; end if;
  if not public.is_active_campaign_member(v_campaign.id) then return query select false, 'Tu dois être joueur actif pour révéler les ordres.', 0, 0, 0, 0; return; end if;
  if v_campaign.status <> 'active' or v_campaign.current_phase <> 'orders' then return query select false, 'Les ordres ne peuvent pas être révélés dans cette phase.', 0, 0, 0, 0; return; end if;
  select * into v_turn from public.campaign_turns where campaign_id = v_campaign.id and turn_number = v_campaign.current_turn_number order by started_at desc limit 1;
  if not found or v_turn.phase <> 'orders' then return query select false, 'Le tour courant n''est pas en phase ordres.', 0, 0, 0, 0; return; end if;
  select count(*) into v_active_count from public.campaign_players where campaign_id = v_campaign.id and status = 'active';
  select count(distinct o.campaign_player_id) into v_submitted_count from public.orders o join public.campaign_players cp on cp.id = o.campaign_player_id where o.campaign_id = v_campaign.id and o.turn_id = v_turn.id and o.status = 'submitted' and cp.status = 'active';
  if v_active_count = 0 or v_submitted_count <> v_active_count then return query select false, 'Tous les joueurs actifs doivent avoir validé leur ordre.', 0, 0, 0, 0; return; end if;
  if exists (select 1 from public.orders o left join public.territories source on source.id = o.source_territory_id left join public.territories target on target.id = o.target_territory_id left join public.territory_adjacencies adjacency on adjacency.campaign_id = o.campaign_id and adjacency.territory_code = source.code and adjacency.adjacent_territory_code = target.code where o.campaign_id = v_campaign.id and o.turn_id = v_turn.id and o.status = 'submitted' and ((o.action_type = 'conquer' and (source.id is null or target.id is null or source.owner_campaign_player_id is distinct from o.campaign_player_id or adjacency.id is null or target.owner_campaign_player_id = o.campaign_player_id)) or (o.action_type = 'fortify' and (target.id is null or target.owner_campaign_player_id is distinct from o.campaign_player_id)))) then
    return query select false, 'Certains ordres ne sont plus valides. Demande aux joueurs concernés de les modifier.', 0, 0, 0, 0; return;
  end if;
  select count(*) into v_multiple_attack_count from (select target_territory_id from public.orders where campaign_id = v_campaign.id and turn_id = v_turn.id and status = 'submitted' and action_type = 'conquer' group by target_territory_id having count(*) > 1) conflicts;
  select count(*) into v_enemy_battle_count from public.orders o join public.territories t on t.id = o.target_territory_id where o.campaign_id = v_campaign.id and o.turn_id = v_turn.id and o.status = 'submitted' and o.action_type = 'conquer' and t.owner_campaign_player_id is not null;
  with ib as (
    insert into public.battles (campaign_id, turn_id, order_id, territory_id, attacker_campaign_player_id, defender_campaign_player_id, army_base_points, defender_bonus)
    select o.campaign_id, o.turn_id, o.id, t.id, o.campaign_player_id, t.owner_campaign_player_id, v_turn.army_base_points, case when t.is_fortified then 'Fortification : défenseur +1 point de commandement au round 1.' else null end
    from public.orders o join public.territories t on t.id = o.target_territory_id
    where o.campaign_id = v_campaign.id and o.turn_id = v_turn.id and o.status = 'submitted' and o.action_type = 'conquer' and t.owner_campaign_player_id is not null
    returning id, campaign_id, order_id, attacker_campaign_player_id, defender_campaign_player_id)
  insert into public.battle_participants (battle_id, campaign_id, campaign_player_id, order_id, role)
  select id, campaign_id, attacker_campaign_player_id, order_id, 'attacker' from ib
  union all select id, campaign_id, defender_campaign_player_id, null, 'defender' from ib;
  select count(*) into v_contested_battle_count from (select o.target_territory_id from public.orders o join public.territories t on t.id = o.target_territory_id where o.campaign_id = v_campaign.id and o.turn_id = v_turn.id and o.status = 'submitted' and o.action_type = 'conquer' and t.owner_campaign_player_id is null group by o.target_territory_id having count(*) > 1) targets;
  with noc as (select o.target_territory_id, count(*) order_count from public.orders o join public.territories t on t.id = o.target_territory_id where o.campaign_id = v_campaign.id and o.turn_id = v_turn.id and o.status = 'submitted' and o.action_type = 'conquer' and t.owner_campaign_player_id is null group by o.target_territory_id),
  co as (select o.id order_id, o.campaign_id, o.turn_id, o.campaign_player_id, o.target_territory_id territory_id, o.submitted_at, roll.dice_result from public.orders o join noc on noc.target_territory_id = o.target_territory_id cross join lateral (select (floor(random() * 6)::int + 1) dice_result where o.id is not null) roll where o.campaign_id = v_campaign.id and o.turn_id = v_turn.id and o.status = 'submitted' and o.action_type = 'conquer' and noc.order_count > 1),
  rc as (select *, row_number() over (partition by territory_id order by dice_result desc, submitted_at asc nulls last, order_id asc) advantage_rank from co),
  seed as (select campaign_id, turn_id, territory_id, (array_agg(order_id order by advantage_rank))[1] order_id, (array_agg(campaign_player_id order by advantage_rank))[1] first_player_id, (array_agg(campaign_player_id order by advantage_rank))[2] second_player_id from rc group by campaign_id, turn_id, territory_id),
  ib as (insert into public.battles (campaign_id, turn_id, order_id, territory_id, attacker_campaign_player_id, defender_campaign_player_id, army_base_points) select campaign_id, turn_id, order_id, territory_id, first_player_id, second_player_id, v_turn.army_base_points from seed returning id, campaign_id, territory_id)
  insert into public.battle_participants (battle_id, campaign_id, campaign_player_id, order_id, role, dice_result, advantage_rank)
  select ib.id, rc.campaign_id, rc.campaign_player_id, rc.order_id, 'contender', rc.dice_result, rc.advantage_rank from rc join ib on ib.territory_id = rc.territory_id;
  select count(*) into v_exploration_count from public.orders o join public.territories t on t.id = o.target_territory_id where o.campaign_id = v_campaign.id and o.turn_id = v_turn.id and o.status = 'submitted' and o.action_type = 'conquer' and t.owner_campaign_player_id is null and not exists (select 1 from public.orders rival where rival.campaign_id = o.campaign_id and rival.turn_id = o.turn_id and rival.status = 'submitted' and rival.action_type = 'conquer' and rival.target_territory_id = o.target_territory_id and rival.id <> o.id);
  with so as (select o.id order_id, o.campaign_id, o.turn_id, o.campaign_player_id, t.id territory_id, case when support.adjacent_support_count >= 3 then 6 else roll.dice_result end dice_result, support.adjacent_support_count, case when support.adjacent_support_count >= 2 then 2 else 3 end conquest_threshold, support.adjacent_support_count >= 3 or roll.dice_result >= case when support.adjacent_support_count >= 2 then 2 else 3 end exploration_success from public.orders o join public.territories t on t.id = o.target_territory_id cross join lateral (select count(distinct owned.id)::int adjacent_support_count from public.territory_adjacencies adjacency join public.territories owned on owned.campaign_id = o.campaign_id and owned.code = adjacency.adjacent_territory_code and owned.owner_campaign_player_id = o.campaign_player_id where adjacency.campaign_id = o.campaign_id and adjacency.territory_code = t.code) support cross join lateral (select (floor(random() * 6)::int + 1) dice_result where o.id is not null) roll where o.campaign_id = v_campaign.id and o.turn_id = v_turn.id and o.status = 'submitted' and o.action_type = 'conquer' and t.owner_campaign_player_id is null and not exists (select 1 from public.orders rival where rival.campaign_id = o.campaign_id and rival.turn_id = o.turn_id and rival.status = 'submitted' and rival.action_type = 'conquer' and rival.target_territory_id = o.target_territory_id and rival.id <> o.id)),
  ie as (insert into public.explorations as inserted_exploration (campaign_id, turn_id, order_id, campaign_player_id, territory_id, status, dice_result, success, resolved_at) select so.campaign_id, so.turn_id, so.order_id, so.campaign_player_id, so.territory_id, 'resolved', so.dice_result, so.exploration_success, now() from so returning inserted_exploration.campaign_id, inserted_exploration.turn_id, inserted_exploration.order_id, inserted_exploration.campaign_player_id, inserted_exploration.territory_id, inserted_exploration.dice_result, inserted_exploration.success as exploration_success),
  gu as (update public.campaign_players cp set glory = glory + 1, updated_at = now() from ie where cp.id = ie.campaign_player_id returning cp.id),
  tu as (update public.territories t set owner_campaign_player_id = ie.campaign_player_id, updated_at = now() from ie where t.id = ie.territory_id and ie.exploration_success returning t.id)
  insert into public.campaign_logs (campaign_id, turn_id, type, title, description, created_by_user_id)
  select ie.campaign_id, ie.turn_id, 'exploration_result', case when ie.exploration_success then 'Conquête réussie' else 'Conquête échouée' end, cp.display_name || ' tente de conquérir ' || t.code || ' - ' || t.name || ' : ' || case when ie.exploration_success then 'réussite' else 'échec' end || case when so.adjacent_support_count >= 3 then ' automatique grâce à ' || so.adjacent_support_count || ' territoires adjacents contrôlés' else ' sur un D6 automatique de ' || ie.dice_result || ' (réussite sur ' || so.conquest_threshold || '+, soutien adjacent : ' || so.adjacent_support_count || ')' end || '. +1 Gloire.', auth.uid() from ie join so on so.order_id = ie.order_id join public.campaign_players cp on cp.id = ie.campaign_player_id join public.territories t on t.id = ie.territory_id;
  v_battle_count := v_enemy_battle_count + v_contested_battle_count;
  update public.territories target set is_fortified = true, updated_at = now() from public.orders o where target.id = o.target_territory_id and o.campaign_id = v_campaign.id and o.turn_id = v_turn.id and o.status = 'submitted' and o.action_type = 'fortify';
  get diagnostics v_fortification_count = row_count;
  insert into public.campaign_logs (campaign_id, turn_id, type, title, description, created_by_user_id)
  select o.campaign_id, o.turn_id, 'territory_fortified', 'Territoire fortifié', cp.display_name || ' fortifie ' || target.code || ' - ' || target.name || '.', auth.uid() from public.orders o join public.campaign_players cp on cp.id = o.campaign_player_id join public.territories target on target.id = o.target_territory_id where o.campaign_id = v_campaign.id and o.turn_id = v_turn.id and o.status = 'submitted' and o.action_type = 'fortify';
  update public.orders set status = 'revealed', revealed_at = now() where campaign_id = v_campaign.id and turn_id = v_turn.id and status = 'submitted';
  insert into public.campaign_logs (campaign_id, turn_id, type, title, description, created_by_user_id)
  values (v_campaign.id, v_turn.id, 'orders_revealed', 'Ordres révélés', 'Révélation : ' || v_battle_count || ' bataille(s), ' || v_exploration_count || ' conquête(s) automatique(s), ' || v_fortification_count || ' fortification(s).' || case when v_multiple_attack_count > 0 then ' Attention : ' || v_multiple_attack_count || ' territoire(s) déclenchent un conflit multiple.' else '' end, auth.uid());
  if v_battle_count = 0 then
    v_next_turn_number := v_campaign.current_turn_number + 1;
    v_next_army_base_points := least(400 + greatest(v_next_turn_number - 1, 0) * 200, 2000);
    update public.orders set status = 'resolved' where campaign_id = v_campaign.id and turn_id = v_turn.id and status = 'revealed';
    update public.campaign_turns set phase = 'finished', ended_at = now() where id = v_turn.id;
    insert into public.campaign_turns (campaign_id, season_number, turn_number, phase, army_base_points)
    values (v_campaign.id, v_campaign.season_number, v_next_turn_number, 'orders', v_next_army_base_points)
    on conflict (campaign_id, turn_number) do update set phase = 'orders', army_base_points = excluded.army_base_points, ended_at = null;
    update public.campaigns set current_turn_number = v_next_turn_number, current_phase = 'orders', updated_at = now() where id = v_campaign.id;
    insert into public.campaign_logs (campaign_id, turn_id, type, title, description, created_by_user_id)
    values (v_campaign.id, v_turn.id, 'turn_finished', 'Tour terminé automatiquement', 'Aucune bataille à résoudre. Le tour ' || v_campaign.current_turn_number || ' est terminé automatiquement. Le tour ' || v_next_turn_number || ' commence avec ' || v_next_army_base_points || ' points d''armée.', auth.uid());
  else
    update public.campaign_turns set phase = 'resolving' where id = v_turn.id;
    update public.campaigns set current_phase = 'resolving', updated_at = now() where id = v_campaign.id;
  end if;
  return query select true, null::text, v_battle_count, v_exploration_count, v_fortification_count, v_multiple_attack_count;
end;
$$;

grant execute on function public.reveal_current_turn_orders(uuid) to authenticated;
notify pgrst, 'reload schema';
