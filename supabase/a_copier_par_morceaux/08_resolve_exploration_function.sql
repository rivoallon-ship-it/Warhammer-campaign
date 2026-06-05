create or replace function public.resolve_exploration_result(target_exploration_id uuid, submitted_dice_result int)
returns table (success boolean, error text, exploration_success boolean)
language plpgsql volatile security definer set search_path = public
as $resolve_exploration_result$
declare
  v_exploration public.explorations%rowtype;
  v_campaign public.campaigns%rowtype;
  v_turn public.campaign_turns%rowtype;
  v_player_name text;
  v_territory public.territories%rowtype;
  v_success boolean;
  v_support int := 0;
  v_threshold int := 3;
  v_ruins_bonus int := 0;
  v_legendary_bonus int := 0;
begin
  if submitted_dice_result < 1 or submitted_dice_result > 6 then
    return query select false, 'Le résultat doit être un D6 entre 1 et 6.', null::boolean;
    return;
  end if;

  select * into v_exploration from public.explorations where id = target_exploration_id;
  if not found then return query select false, 'Exploration introuvable.', null::boolean; return; end if;
  select * into v_campaign from public.campaigns where id = v_exploration.campaign_id;
  if not found then return query select false, 'Campagne introuvable.', null::boolean; return; end if;
  if not public.is_campaign_master(v_campaign.id) then
    return query select false, 'Seul le maître de campagne peut résoudre une exploration.', null::boolean;
    return;
  end if;
  if v_campaign.status <> 'active' or v_campaign.current_phase <> 'resolving' then
    return query select false, 'La campagne doit être en phase de résolution.', null::boolean;
    return;
  end if;
  select * into v_turn from public.campaign_turns where id = v_exploration.turn_id;
  if not found or v_turn.phase <> 'resolving' then
    return query select false, 'Le tour courant doit être en phase de résolution.', null::boolean;
    return;
  end if;
  if v_exploration.status <> 'pending' then
    return query select false, 'Cette exploration est déjà résolue.', null::boolean;
    return;
  end if;

  select display_name into v_player_name from public.campaign_players where id = v_exploration.campaign_player_id;
  select * into v_territory from public.territories where id = v_exploration.territory_id;
  if v_player_name is null or v_territory.id is null then
    return query select false, 'Données d''exploration incomplètes.', null::boolean;
    return;
  end if;
  select count(distinct owned.id)::int into v_support
  from public.territory_adjacencies adjacency
  join public.territories owned
    on owned.campaign_id = v_exploration.campaign_id
    and owned.code = adjacency.adjacent_territory_code
    and owned.owner_campaign_player_id = v_exploration.campaign_player_id
  where adjacency.campaign_id = v_exploration.campaign_id
    and adjacency.territory_code = v_territory.code;

  v_threshold := case when v_support >= 2 then 2 when v_territory.type in ('dragon', 'giant') then 4 else 3 end;
  v_success := v_support >= 3 or submitted_dice_result >= v_threshold;
  v_ruins_bonus := case when v_success and v_territory.type = 'ruins' and v_territory.special_reward_claimed_at is null then 1 else 0 end;
  v_legendary_bonus := case when v_success and v_territory.type in ('dragon', 'giant') then 3 else 0 end;

  update public.explorations
  set dice_result = submitted_dice_result, success = v_success, status = 'resolved', resolved_at = now()
  where id = v_exploration.id;
  update public.campaign_players
  set glory = glory + 1 + v_ruins_bonus + v_legendary_bonus, updated_at = now()
  where id = v_exploration.campaign_player_id;
  if v_success then
    update public.territories
    set owner_campaign_player_id = v_exploration.campaign_player_id,
        special_reward_claimed_at = case when v_ruins_bonus > 0 then now() else special_reward_claimed_at end,
        updated_at = now()
    where id = v_exploration.territory_id;
  end if;
  insert into public.campaign_logs (campaign_id, turn_id, type, title, description, created_by_user_id)
  values (v_exploration.campaign_id, v_exploration.turn_id, 'exploration_result',
    case when v_success then 'Exploration réussie' else 'Exploration échouée' end,
    v_player_name || ' explore ' || v_territory.code || ' - ' || v_territory.name || ' : '
    || case when v_success then 'réussite' else 'échec' end || ' sur D6 ' || submitted_dice_result || '. +1 Gloire'
    || case when v_ruins_bonus > 0 then ', +1 ruines' else '' end
    || case when v_legendary_bonus > 0 then ', +3 ' || case when v_territory.type = 'dragon' then 'Dragon' else 'Géant' end else '' end || '.',
    auth.uid());
  return query select true, null::text, v_success;
end;
$resolve_exploration_result$;
