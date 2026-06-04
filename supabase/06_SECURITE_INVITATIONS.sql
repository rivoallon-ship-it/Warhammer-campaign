-- Correctif sécurité : le code d'invitation devient la seule porte d'entrée
-- pour lire un lobby non rejoint et demander une inscription.

create or replace function public.normalize_invite_code(raw_value text)
returns text
language sql
immutable
set search_path = public
as $$
  select upper(regexp_replace(trim(coalesce(raw_value, '')), '[[:space:]-]+', '', 'g'));
$$;

create or replace function public.campaign_capital_slots(target_player_count int)
returns text[]
language sql
immutable
set search_path = public
as $$
  select case target_player_count
    when 2 then array['A1', 'D5']::text[]
    when 3 then array['A1', 'A6', 'E3']::text[]
    when 4 then array['A1', 'A7', 'E1', 'E7']::text[]
    when 5 then array['A1', 'A8', 'F1', 'F8', 'C4']::text[]
    when 6 then array['A1', 'A9', 'F1', 'F9', 'C4', 'D6']::text[]
    else array[]::text[]
  end;
$$;

create or replace function public.get_join_campaign_details(
  target_invite_code text
)
returns table (
  success boolean,
  error text,
  campaign jsonb,
  players jsonb
)
language plpgsql
stable
security definer
set search_path = public
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

  select *
  into v_campaign
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

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', cp.id,
        'display_name', cp.display_name,
        'aos_faction', cp.aos_faction,
        'color', cp.color,
        'status', cp.status,
        'starting_capital_code', cp.starting_capital_code,
        'is_current_user', cp.user_id = auth.uid()
      )
      order by cp.created_at
    ),
    '[]'::jsonb
  )
  into v_players
  from public.campaign_players cp
  where cp.campaign_id = v_campaign.id
    and cp.status in ('pending', 'active');

  return query select
    true,
    null::text,
    jsonb_build_object(
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
    ),
    v_players;
end;
$$;

create or replace function public.request_join_campaign(
  target_invite_code text,
  submitted_display_name text,
  submitted_aos_faction text,
  submitted_color text,
  submitted_starting_capital_code text
)
returns table (
  success boolean,
  error text,
  campaign_id uuid
)
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_invite_code text;
  v_display_name text;
  v_aos_faction text;
  v_color text;
  v_normalized_color text;
  v_starting_capital_code text;
  v_campaign public.campaigns%rowtype;
  v_existing_player public.campaign_players%rowtype;
  v_reserved_player_count int := 0;
begin
  if auth.uid() is null then
    return query select false, 'Connexion requise.', null::uuid;
    return;
  end if;

  v_invite_code := public.normalize_invite_code(target_invite_code);
  v_display_name := regexp_replace(trim(coalesce(submitted_display_name, '')), '[[:space:]]+', ' ', 'g');
  v_aos_faction := regexp_replace(trim(coalesce(submitted_aos_faction, '')), '[[:space:]]+', ' ', 'g');
  v_color := trim(coalesce(submitted_color, ''));
  v_normalized_color := lower(v_color);
  v_starting_capital_code := upper(trim(coalesce(submitted_starting_capital_code, '')));

  if v_invite_code = '' then
    return query select false, 'Le code invitation est obligatoire.', null::uuid;
    return;
  end if;

  if v_display_name = '' then
    return query select false, 'Le pseudo est obligatoire.', null::uuid;
    return;
  end if;

  if v_aos_faction = '' then
    return query select false, 'La faction est obligatoire.', null::uuid;
    return;
  end if;

  if v_color = '' then
    return query select false, 'Choisis une couleur.', null::uuid;
    return;
  end if;

  if v_normalized_color not in (
    '#b84b35',
    '#2f6f9f',
    '#3f7d4b',
    '#7251a5',
    '#a77b24',
    '#302720'
  ) then
    return query select false, 'Cette couleur n''est pas disponible.', null::uuid;
    return;
  end if;

  if v_starting_capital_code = '' then
    return query select false, 'Choisis une capitale.', null::uuid;
    return;
  end if;

  select *
  into v_campaign
  from public.campaigns c
  where c.invite_code = v_invite_code
  for update;

  if not found then
    return query select false, 'Aucune campagne ne correspond à ce code.', null::uuid;
    return;
  end if;

  if v_campaign.status <> 'lobby' then
    return query select false, 'Cette campagne n''est plus en lobby.', null::uuid;
    return;
  end if;

  select *
  into v_existing_player
  from public.campaign_players cp
  where cp.campaign_id = v_campaign.id
    and cp.user_id = auth.uid()
  limit 1;

  if found then
    if v_existing_player.status in ('pending', 'active') then
      return query select true, null::text, v_campaign.id;
      return;
    end if;

    return query select false, 'Tu as déjà une entrée dans cette campagne.', null::uuid;
    return;
  end if;

  select count(*)
  into v_reserved_player_count
  from public.campaign_players cp
  where cp.campaign_id = v_campaign.id
    and cp.status in ('pending', 'active');

  if v_reserved_player_count >= v_campaign.player_count then
    return query select false, 'Cette campagne est pleine ou toutes les places sont demandées.', null::uuid;
    return;
  end if;

  if not (v_starting_capital_code = any(public.campaign_capital_slots(v_campaign.player_count))) then
    return query select false, 'Cette capitale n''est pas autorisée pour cette carte.', null::uuid;
    return;
  end if;

  if exists (
    select 1
    from public.campaign_players cp
    where cp.campaign_id = v_campaign.id
      and cp.status in ('pending', 'active')
      and lower(cp.color) = v_normalized_color
  ) then
    return query select false, 'Cette couleur est déjà prise.', null::uuid;
    return;
  end if;

  if exists (
    select 1
    from public.campaign_players cp
    where cp.campaign_id = v_campaign.id
      and cp.status in ('pending', 'active')
      and upper(cp.starting_capital_code) = v_starting_capital_code
  ) then
    return query select false, 'Cette capitale est déjà prise.', null::uuid;
    return;
  end if;

  insert into public.campaign_players (
    campaign_id,
    user_id,
    display_name,
    aos_faction,
    color,
    role,
    status,
    starting_capital_code,
    glory,
    is_ready
  )
  values (
    v_campaign.id,
    auth.uid(),
    v_display_name,
    v_aos_faction,
    v_color,
    'player',
    'pending',
    v_starting_capital_code,
    0,
    false
  );

  insert into public.campaign_logs (
    campaign_id,
    type,
    title,
    description,
    created_by_user_id
  )
  values (
    v_campaign.id,
    'player_joined',
    'Demande envoyée',
    v_display_name || ' a demandé à rejoindre la campagne.',
    auth.uid()
  );

  return query select true, null::text, v_campaign.id;
end;
$$;

drop policy if exists "Campaigns readable by members and lobby seekers" on public.campaigns;
drop policy if exists "Campaigns readable by members" on public.campaigns;
create policy "Campaigns readable by members"
on public.campaigns for select
to authenticated
using (
  owner_user_id = auth.uid()
  or public.is_campaign_member(id)
);

drop policy if exists "Campaign players readable by campaign context" on public.campaign_players;
drop policy if exists "Campaign players readable by campaign members" on public.campaign_players;
create policy "Campaign players readable by campaign members"
on public.campaign_players for select
to authenticated
using (
  user_id = auth.uid()
  or public.is_campaign_member(campaign_id)
);

drop policy if exists "Users join lobby campaigns or create their game master row" on public.campaign_players;
drop policy if exists "Users create their game master row" on public.campaign_players;
create policy "Users create their game master row"
on public.campaign_players for insert
to authenticated
with check (
  user_id = auth.uid()
  and role = 'game_master'
  and status = 'active'
  and public.is_campaign_owner(campaign_id)
);

grant execute on function public.normalize_invite_code(text) to authenticated;
grant execute on function public.campaign_capital_slots(int) to authenticated;
grant execute on function public.get_join_campaign_details(text) to authenticated;
grant execute on function public.request_join_campaign(text, text, text, text, text) to authenticated;
