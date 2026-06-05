create or replace function public.resolve_exploration_result(
  target_exploration_id uuid,
  submitted_dice_result int
)
returns table (
  success boolean,
  error text,
  exploration_success boolean
)
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_exploration public.explorations%rowtype;
  v_campaign public.campaigns%rowtype;
  v_turn public.campaign_turns%rowtype;
  v_player public.campaign_players%rowtype;
  v_territory public.territories%rowtype;
  v_success boolean;
  v_adjacent_support_count int := 0;
  v_conquest_threshold int := 3;
begin
  if submitted_dice_result < 1 or submitted_dice_result > 6 then
    return query select false, 'Le résultat doit être un D6 entre 1 et 6.', null::boolean;
    return;
  end if;

  select *
  into v_exploration
  from public.explorations
  where id = target_exploration_id;

  if not found then
    return query select false, 'Exploration introuvable.', null::boolean;
    return;
  end if;

  select *
  into v_campaign
  from public.campaigns
  where id = v_exploration.campaign_id;

  if not found then
    return query select false, 'Campagne introuvable.', null::boolean;
    return;
  end if;

  if not public.is_campaign_master(v_campaign.id) then
    return query select false, 'Seul le maître de campagne peut résoudre une exploration.', null::boolean;
    return;
  end if;

  if v_campaign.status <> 'active' or v_campaign.current_phase <> 'resolving' then
    return query select false, 'La campagne doit être en phase de résolution.', null::boolean;
    return;
  end if;

  select *
  into v_turn
  from public.campaign_turns
  where id = v_exploration.turn_id;

  if not found or v_turn.phase <> 'resolving' then
    return query select false, 'Le tour courant doit être en phase de résolution.', null::boolean;
    return;
  end if;

  if v_exploration.status <> 'pending' then
    return query select false, 'Cette exploration est déjà résolue.', null::boolean;
    return;
  end if;

  select *
  into v_player
  from public.campaign_players
  where id = v_exploration.campaign_player_id;

  if not found then
    return query select false, 'Joueur introuvable.', null::boolean;
    return;
  end if;

  select *
  into v_territory
  from public.territories
  where id = v_exploration.territory_id;

  if not found then
    return query select false, 'Territoire introuvable.', null::boolean;
    return;
  end if;

  select count(distinct owned.id)::int
  into v_adjacent_support_count
  from public.territory_adjacencies adjacency
  join public.territories owned
    on owned.campaign_id = v_exploration.campaign_id
    and owned.code = adjacency.adjacent_territory_code
    and owned.owner_campaign_player_id = v_exploration.campaign_player_id
  where adjacency.campaign_id = v_exploration.campaign_id
    and adjacency.territory_code = v_territory.code;

  v_conquest_threshold := case
    when v_adjacent_support_count >= 2 then 2
    else 3
  end;

  v_success := v_adjacent_support_count >= 3
    or submitted_dice_result >= v_conquest_threshold;

  update public.explorations
  set dice_result = submitted_dice_result,
      success = v_success,
      status = 'resolved',
      resolved_at = now()
  where id = v_exploration.id;

  update public.campaign_players
  set glory = glory + 1,
      updated_at = now()
  where id = v_exploration.campaign_player_id;

  if v_success then
    update public.territories
    set owner_campaign_player_id = v_exploration.campaign_player_id,
        updated_at = now()
    where id = v_exploration.territory_id;
  end if;

  insert into public.campaign_logs (
    campaign_id,
    turn_id,
    type,
    title,
    description,
    created_by_user_id
  )
  values (
    v_exploration.campaign_id,
    v_exploration.turn_id,
    'exploration_result',
    case when v_success then 'Exploration réussie' else 'Exploration échouée' end,
    v_player.display_name || ' explore ' || v_territory.code || ' - '
      || v_territory.name || ' : '
      || case
        when v_success then 'réussite'
        else 'échec'
      end
      || case
        when v_adjacent_support_count >= 3
          then ' automatique grâce à ' || v_adjacent_support_count || ' territoires adjacents contrôlés'
        else ' sur un D6 de ' || submitted_dice_result
          || ' (réussite sur ' || v_conquest_threshold
          || '+, soutien adjacent : ' || v_adjacent_support_count || ')'
      end
      || '. +1 Gloire.',
    auth.uid()
  );

  return query select true, null::text, v_success;
end;
$$;
