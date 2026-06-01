-- Correctif points d'armée.
-- À copier dans Supabase SQL Editor pour mettre à jour une base déjà installée.
-- Nouvelle règle : tour 1 = 400 points, +200 points par tour, maximum 2000 points.

update public.campaign_turns
set army_base_points = least(400 + greatest(turn_number - 1, 0) * 200, 2000)
where phase <> 'finished';

update public.battles b
set army_base_points = ct.army_base_points
from public.campaign_turns ct
where b.turn_id = ct.id
  and b.status = 'pending'
  and ct.phase <> 'finished';

create or replace function public.finish_current_turn(target_campaign_id uuid)
returns table (
  success boolean,
  error text,
  next_turn_number int,
  next_army_base_points int
)
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_campaign public.campaigns%rowtype;
  v_turn public.campaign_turns%rowtype;
  v_unresolved_explorations int := 0;
  v_unresolved_battles int := 0;
  v_next_turn_number int;
  v_next_army_base_points int;
begin
  select * into v_campaign from public.campaigns where id = target_campaign_id;
  if not found then
    return query select false, 'Campagne introuvable.', null::int, null::int;
    return;
  end if;

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

  v_next_turn_number := v_campaign.current_turn_number + 1;
  v_next_army_base_points := least(400 + greatest(v_next_turn_number - 1, 0) * 200, 2000);

  update public.orders set status = 'resolved'
  where campaign_id = v_campaign.id and turn_id = v_turn.id and status = 'revealed';

  update public.campaign_turns set phase = 'finished', ended_at = now()
  where id = v_turn.id;

  insert into public.campaign_turns (campaign_id, season_number, turn_number, phase, army_base_points)
  values (v_campaign.id, v_campaign.season_number, v_next_turn_number, 'orders', v_next_army_base_points)
  on conflict (campaign_id, turn_number) do update
  set phase = 'orders', army_base_points = excluded.army_base_points, ended_at = null;

  update public.campaigns
  set current_turn_number = v_next_turn_number, current_phase = 'orders', updated_at = now()
  where id = v_campaign.id;

  insert into public.campaign_logs (campaign_id, turn_id, type, title, description, created_by_user_id)
  values (v_campaign.id, v_turn.id, 'turn_finished', 'Tour terminé', 'Le tour ' || v_campaign.current_turn_number || ' est terminé. Le tour ' || v_next_turn_number || ' commence avec ' || v_next_army_base_points || ' points d''armée.', auth.uid());

  return query select true, null::text, v_next_turn_number, v_next_army_base_points;
end;
$$;
