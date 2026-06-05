create or replace function public.is_active_campaign_member(target_campaign_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.campaign_players cp
    where cp.campaign_id = target_campaign_id
      and cp.user_id = auth.uid()
      and cp.status = 'active'
  );
$$;

create or replace function public.is_campaign_master(target_campaign_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.campaign_players cp
    where cp.campaign_id = target_campaign_id
      and cp.user_id = auth.uid()
      and cp.role = 'game_master'
      and cp.status = 'active'
  );
$$;

create or replace function public.owns_campaign_player(target_campaign_player_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.campaign_players cp
    where cp.id = target_campaign_player_id
      and cp.user_id = auth.uid()
      and cp.status in ('pending', 'active')
  );
$$;

create or replace function public.campaign_player_keeps_identity(
  target_campaign_player_id uuid,
  target_campaign_id uuid,
  target_user_id uuid,
  target_role text,
  target_status text
)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.campaign_players cp
    where cp.id = target_campaign_player_id
      and cp.campaign_id = target_campaign_id
      and cp.user_id = target_user_id
      and cp.role = target_role
      and cp.status = target_status
  );
$$;

create or replace function public.normalize_invite_code(raw_value text)
returns text
language sql immutable set search_path = public
as $$
  select upper(regexp_replace(trim(coalesce(raw_value, '')), '[[:space:]-]+', '', 'g'));
$$;

create or replace function public.campaign_capital_slots(target_player_count int)
returns text[]
language sql immutable set search_path = public
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
