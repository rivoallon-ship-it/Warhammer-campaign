create or replace function public.request_join_campaign(
  target_invite_code text,
  submitted_display_name text,
  submitted_aos_faction text,
  submitted_color text,
  submitted_starting_capital_code text
)
returns table (success boolean, error text, campaign_id uuid)
language plpgsql volatile security definer set search_path = public
as $$
declare
  v_code text := public.normalize_invite_code(target_invite_code);
  v_name text := regexp_replace(trim(coalesce(submitted_display_name, '')), '[[:space:]]+', ' ', 'g');
  v_faction text := regexp_replace(trim(coalesce(submitted_aos_faction, '')), '[[:space:]]+', ' ', 'g');
  v_color text := trim(coalesce(submitted_color, ''));
  v_color_key text := lower(trim(coalesce(submitted_color, '')));
  v_capital text := upper(trim(coalesce(submitted_starting_capital_code, '')));
  v_campaign public.campaigns%rowtype;
  v_existing public.campaign_players%rowtype;
  v_reserved_count int := 0;
begin
  if auth.uid() is null then return query select false, 'Connexion requise.', null::uuid; return; end if;
  if v_code = '' then return query select false, 'Le code invitation est obligatoire.', null::uuid; return; end if;
  if v_name = '' then return query select false, 'Le pseudo est obligatoire.', null::uuid; return; end if;
  if v_faction = '' then return query select false, 'La faction est obligatoire.', null::uuid; return; end if;
  if v_color = '' then return query select false, 'Choisis une couleur.', null::uuid; return; end if;
  if v_color_key not in ('#b84b35','#2f6f9f','#3f7d4b','#7251a5','#a77b24','#302720') then
    return query select false, 'Cette couleur n''est pas disponible.', null::uuid;
    return;
  end if;
  if v_capital = '' then return query select false, 'Choisis une capitale.', null::uuid; return; end if;

  select * into v_campaign from public.campaigns c where c.invite_code = v_code for update;
  if not found then return query select false, 'Aucune campagne ne correspond à ce code.', null::uuid; return; end if;
  if v_campaign.status <> 'lobby' then return query select false, 'Cette campagne n''est plus en lobby.', null::uuid; return; end if;

  select * into v_existing
  from public.campaign_players cp
  where cp.campaign_id = v_campaign.id and cp.user_id = auth.uid()
  limit 1;
  if found then
    if v_existing.status in ('pending', 'active') then
      return query select true, null::text, v_campaign.id;
      return;
    end if;
    return query select false, 'Tu as déjà une entrée dans cette campagne.', null::uuid;
    return;
  end if;

  select count(*) into v_reserved_count
  from public.campaign_players cp
  where cp.campaign_id = v_campaign.id and cp.status in ('pending', 'active');
  if v_reserved_count >= v_campaign.player_count then
    return query select false, 'Cette campagne est pleine ou toutes les places sont demandées.', null::uuid;
    return;
  end if;
  if not (v_capital = any(public.campaign_capital_slots(v_campaign.player_count))) then
    return query select false, 'Cette capitale n''est pas autorisée pour cette carte.', null::uuid;
    return;
  end if;
  if exists (select 1 from public.campaign_players cp where cp.campaign_id = v_campaign.id and cp.status in ('pending', 'active') and lower(cp.color) = v_color_key) then
    return query select false, 'Cette couleur est déjà prise.', null::uuid;
    return;
  end if;
  if exists (select 1 from public.campaign_players cp where cp.campaign_id = v_campaign.id and cp.status in ('pending', 'active') and upper(cp.starting_capital_code) = v_capital) then
    return query select false, 'Cette capitale est déjà prise.', null::uuid;
    return;
  end if;

  insert into public.campaign_players (campaign_id, user_id, display_name, aos_faction, color, role, status, starting_capital_code, glory, is_ready)
  values (v_campaign.id, auth.uid(), v_name, v_faction, v_color, 'player', 'pending', v_capital, 0, false);
  insert into public.campaign_logs (campaign_id, type, title, description, created_by_user_id)
  values (v_campaign.id, 'player_joined', 'Demande envoyée', v_name || ' a demandé à rejoindre la campagne.', auth.uid());
  return query select true, null::text, v_campaign.id;
end;
$$;

grant execute on function public.request_join_campaign(text, text, text, text, text) to authenticated;
