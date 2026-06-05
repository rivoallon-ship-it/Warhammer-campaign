create or replace function public.get_join_campaign_details(target_invite_code text)
returns table (success boolean, error text, campaign jsonb, players jsonb)
language plpgsql stable security definer set search_path = public
as $$
declare
  v_invite_code text;
  v_campaign public.campaigns%rowtype;
  v_players jsonb := '[]'::jsonb;
begin
  if auth.uid() is null then
    return query select false, 'Connexion requise.', null::jsonb, '[]'::jsonb;
    return;
  end if;
  v_invite_code := public.normalize_invite_code(target_invite_code);
  if v_invite_code = '' then
    return query select false, 'Saisis un code invitation.', null::jsonb, '[]'::jsonb;
    return;
  end if;

  select * into v_campaign
  from public.campaigns c
  where c.invite_code = v_invite_code;
  if not found then
    return query select false, 'Aucune campagne ne correspond à ce code.', null::jsonb, '[]'::jsonb;
    return;
  end if;
  if v_campaign.status <> 'lobby' and not public.is_campaign_member(v_campaign.id) then
    return query select false, 'Cette campagne n''est plus en lobby.', null::jsonb, '[]'::jsonb;
    return;
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', cp.id,
    'display_name', cp.display_name,
    'aos_faction', cp.aos_faction,
    'color', cp.color,
    'status', cp.status,
    'starting_capital_code', cp.starting_capital_code,
    'is_current_user', cp.user_id = auth.uid()
  ) order by cp.created_at), '[]'::jsonb)
  into v_players
  from public.campaign_players cp
  where cp.campaign_id = v_campaign.id
    and cp.status in ('pending', 'active');

  return query select true, null::text, jsonb_build_object(
    'id', v_campaign.id,
    'name', v_campaign.name,
    'invite_code', v_campaign.invite_code,
    'status', v_campaign.status,
    'current_phase', v_campaign.current_phase,
    'season_number', v_campaign.season_number,
    'current_turn_number', v_campaign.current_turn_number,
    'player_count', v_campaign.player_count,
    'map_width', v_campaign.map_width,
    'map_height', v_campaign.map_height,
    'map_template', v_campaign.map_template,
    'created_at', v_campaign.created_at,
    'updated_at', v_campaign.updated_at
  ), v_players;
end;
$$;
