create or replace function public.finish_current_turn(target_campaign_id uuid)
returns table (success boolean, error text, next_turn_number int, next_army_base_points int)
language plpgsql volatile security definer set search_path = public
as $finish_current_turn$
declare
  v_campaign public.campaigns%rowtype;
  v_turn public.campaign_turns%rowtype;
  v_unresolved_explorations int := 0;
  v_unresolved_battles int := 0;
  v_next_turn int;
  v_next_points int;
  v_income_players int := 0;
  v_income_glory int := 0;
begin
  select * into v_campaign from public.campaigns where id = target_campaign_id for update;
  if not found then return query select false, 'Campagne introuvable.', null::int, null::int; return; end if;
  if not public.is_campaign_master(v_campaign.id) then
    return query select false, 'Seul le maître de campagne peut terminer le tour.', null::int, null::int;
    return;
  end if;
  if v_campaign.status <> 'active' or v_campaign.current_phase not in ('resolving', 'end_turn') then
    return query select false, 'La campagne doit être en phase de résolution.', null::int, null::int;
    return;
  end if;

  select * into v_turn
  from public.campaign_turns
  where campaign_id = v_campaign.id and turn_number = v_campaign.current_turn_number
  order by started_at desc
  limit 1;
  if not found or v_turn.phase not in ('resolving', 'end_turn') then
    return query select false, 'Le tour courant doit être en phase de résolution.', null::int, null::int;
    return;
  end if;

  select count(*) into v_unresolved_explorations
  from public.explorations
  where campaign_id = v_campaign.id and turn_id = v_turn.id and status <> 'resolved';
  select count(*) into v_unresolved_battles
  from public.battles
  where campaign_id = v_campaign.id and turn_id = v_turn.id and status not in ('played', 'cancelled');
  if v_unresolved_explorations > 0 or v_unresolved_battles > 0 then
    return query select false, 'Toutes les explorations et batailles doivent être résolues.', null::int, null::int;
    return;
  end if;

  v_next_turn := v_campaign.current_turn_number + 1;
  v_next_points := least(400 + greatest(v_next_turn - 1, 0) * 200, 2000);
  with income as (
    select cp.id, floor(count(t.id)::numeric / 3)::int as territory_glory,
      (count(t.id) filter (where t.type = 'mine'))::int as mine_glory
    from public.campaign_players cp
    left join public.territories t on t.owner_campaign_player_id = cp.id and t.campaign_id = cp.campaign_id
    where cp.campaign_id = v_campaign.id and cp.status = 'active'
    group by cp.id
  ), awarded as (
    update public.campaign_players cp
    set glory = glory + income.territory_glory + income.mine_glory, updated_at = now()
    from income
    where cp.id = income.id and income.territory_glory + income.mine_glory > 0
    returning income.territory_glory + income.mine_glory as glory_gain
  )
  select count(*)::int, coalesce(sum(glory_gain), 0)::int
  into v_income_players, v_income_glory
  from awarded;

  update public.orders set status = 'resolved'
  where campaign_id = v_campaign.id and turn_id = v_turn.id and status = 'revealed';
  update public.campaign_turns set phase = 'finished', ended_at = now() where id = v_turn.id;
  insert into public.campaign_turns (campaign_id, season_number, turn_number, phase, army_base_points)
  values (v_campaign.id, v_campaign.season_number, v_next_turn, 'orders', v_next_points)
  on conflict (campaign_id, turn_number) do update
  set phase = 'orders', army_base_points = excluded.army_base_points, ended_at = null;
  update public.campaigns
  set current_turn_number = v_next_turn, current_phase = 'orders', updated_at = now()
  where id = v_campaign.id;
  insert into public.campaign_logs (campaign_id, turn_id, type, title, description, created_by_user_id)
  values (v_campaign.id, v_turn.id, 'turn_finished', 'Tour terminé',
    'Le tour ' || v_campaign.current_turn_number || ' est terminé. Le tour ' || v_next_turn
    || ' commence avec ' || v_next_points || ' points d''armée.'
    || case when v_income_glory > 0 then ' Revenus : ' || v_income_glory || ' Gloire pour ' || v_income_players || ' joueur(s).' else '' end,
    auth.uid());
  return query select true, null::text, v_next_turn, v_next_points;
end;
$finish_current_turn$;
