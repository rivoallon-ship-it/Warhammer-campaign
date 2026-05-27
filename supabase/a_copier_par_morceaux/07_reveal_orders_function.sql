create or replace function public.reveal_current_turn_orders(target_campaign_id uuid)
returns table (success boolean, error text, battle_count int, exploration_count int, fortification_count int, multiple_attack_count int)
language plpgsql volatile security definer set search_path = public as $$
declare
  v_campaign public.campaigns%rowtype;
  v_turn public.campaign_turns%rowtype;
  v_active_count int := 0;
  v_submitted_count int := 0;
  v_battle_count int := 0;
  v_exploration_count int := 0;
  v_fortification_count int := 0;
  v_multiple_attack_count int := 0;
begin
  select * into v_campaign from public.campaigns where id = target_campaign_id;
  if not found then return query select false, 'Campagne introuvable.', 0, 0, 0, 0; return; end if;
  if not public.is_campaign_master(v_campaign.id) then return query select false, 'Seul le maître de campagne peut révéler les ordres.', 0, 0, 0, 0; return; end if;
  if v_campaign.status <> 'active' or v_campaign.current_phase <> 'orders' then return query select false, 'Les ordres ne peuvent pas être révélés dans cette phase.', 0, 0, 0, 0; return; end if;
  select * into v_turn from public.campaign_turns where campaign_id = v_campaign.id and turn_number = v_campaign.current_turn_number order by started_at desc limit 1;
  if not found or v_turn.phase <> 'orders' then return query select false, 'Le tour courant n''est pas en phase ordres.', 0, 0, 0, 0; return; end if;
  select count(*) into v_active_count from public.campaign_players where campaign_id = v_campaign.id and status = 'active';
  select count(distinct o.campaign_player_id) into v_submitted_count from public.orders o join public.campaign_players cp on cp.id = o.campaign_player_id where o.campaign_id = v_campaign.id and o.turn_id = v_turn.id and o.status = 'submitted' and cp.status = 'active';
  if v_active_count = 0 or v_submitted_count <> v_active_count then return query select false, 'Tous les joueurs actifs doivent avoir validé leur ordre.', 0, 0, 0, 0; return; end if;
  if exists (
    select 1 from public.orders o
    left join public.territories source on source.id = o.source_territory_id
    left join public.territories target on target.id = o.target_territory_id
    left join public.territory_adjacencies adjacency on adjacency.campaign_id = o.campaign_id and adjacency.territory_code = source.code and adjacency.adjacent_territory_code = target.code
    where o.campaign_id = v_campaign.id and o.turn_id = v_turn.id and o.status = 'submitted'
    and (
      (o.action_type in ('attack', 'explore') and (source.id is null or target.id is null or source.owner_campaign_player_id is distinct from o.campaign_player_id or adjacency.id is null or (o.action_type = 'attack' and (target.owner_campaign_player_id is null or target.owner_campaign_player_id = o.campaign_player_id)) or (o.action_type = 'explore' and target.owner_campaign_player_id is not null)))
      or (o.action_type = 'fortify' and (target.id is null or target.owner_campaign_player_id is distinct from o.campaign_player_id))
    )
  ) then return query select false, 'Certains ordres ne sont plus valides. Demande aux joueurs concernés de les modifier.', 0, 0, 0, 0; return; end if;
  select count(*) into v_multiple_attack_count from (select o.target_territory_id from public.orders o where o.campaign_id = v_campaign.id and o.turn_id = v_turn.id and o.status = 'submitted' and o.action_type = 'attack' group by o.target_territory_id having count(*) > 1) contested_targets;
  insert into public.battles (campaign_id, turn_id, order_id, territory_id, attacker_campaign_player_id, defender_campaign_player_id, army_base_points, defender_bonus)
  select o.campaign_id, o.turn_id, o.id, target.id, o.campaign_player_id, target.owner_campaign_player_id, v_turn.army_base_points, case when target.is_fortified then 'Fortification : défenseur +1 point de commandement au round 1.' else null end
  from public.orders o join public.territories target on target.id = o.target_territory_id
  where o.campaign_id = v_campaign.id and o.turn_id = v_turn.id and o.status = 'submitted' and o.action_type = 'attack';
  get diagnostics v_battle_count = row_count;
  insert into public.explorations (campaign_id, turn_id, order_id, campaign_player_id, territory_id)
  select o.campaign_id, o.turn_id, o.id, o.campaign_player_id, target.id
  from public.orders o join public.territories target on target.id = o.target_territory_id
  where o.campaign_id = v_campaign.id and o.turn_id = v_turn.id and o.status = 'submitted' and o.action_type = 'explore';
  get diagnostics v_exploration_count = row_count;
  update public.territories target set is_fortified = true, updated_at = now()
  from public.orders o where target.id = o.target_territory_id and o.campaign_id = v_campaign.id and o.turn_id = v_turn.id and o.status = 'submitted' and o.action_type = 'fortify';
  get diagnostics v_fortification_count = row_count;
  insert into public.campaign_logs (campaign_id, turn_id, type, title, description, created_by_user_id)
  select o.campaign_id, o.turn_id, 'territory_fortified', 'Territoire fortifié', cp.display_name || ' fortifie ' || target.code || ' - ' || target.name || '.', auth.uid()
  from public.orders o join public.campaign_players cp on cp.id = o.campaign_player_id join public.territories target on target.id = o.target_territory_id
  where o.campaign_id = v_campaign.id and o.turn_id = v_turn.id and o.status = 'submitted' and o.action_type = 'fortify';
  update public.orders set status = 'revealed', revealed_at = now() where campaign_id = v_campaign.id and turn_id = v_turn.id and status = 'submitted';
  update public.campaign_turns set phase = 'resolving' where id = v_turn.id;
  update public.campaigns set current_phase = 'resolving', updated_at = now() where id = v_campaign.id;
  insert into public.campaign_logs (campaign_id, turn_id, type, title, description, created_by_user_id)
  values (v_campaign.id, v_turn.id, 'orders_revealed', 'Ordres révélés', 'Révélation : ' || v_battle_count || ' bataille(s), ' || v_exploration_count || ' exploration(s), ' || v_fortification_count || ' fortification(s).' || case when v_multiple_attack_count > 0 then ' Attention : ' || v_multiple_attack_count || ' territoire(s) subissent plusieurs attaques.' else '' end, auth.uid());
  return query select true, null::text, v_battle_count, v_exploration_count, v_fortification_count, v_multiple_attack_count;
end;
$$;
