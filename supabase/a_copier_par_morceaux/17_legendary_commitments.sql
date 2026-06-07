alter table public.battle_participants add column if not exists dragon_recruits_committed int not null default 0;
alter table public.battle_participants add column if not exists giant_recruits_committed int not null default 0;
alter table public.battle_participants drop constraint if exists battle_participants_dragon_recruits_committed_check;
alter table public.battle_participants add constraint battle_participants_dragon_recruits_committed_check check (dragon_recruits_committed >= 0);
alter table public.battle_participants drop constraint if exists battle_participants_giant_recruits_committed_check;
alter table public.battle_participants add constraint battle_participants_giant_recruits_committed_check check (giant_recruits_committed >= 0);

create or replace function public.commit_legendary_reinforcements(target_battle_id uuid, submitted_dragon_recruits int default 0, submitted_giant_recruits int default 0)
returns table (success boolean, error text, dragon_recruits_committed int, giant_recruits_committed int)
language plpgsql volatile security definer set search_path = public as $commit_legendary_reinforcements$
declare
  v_battle public.battles%rowtype;
  v_campaign public.campaigns%rowtype;
  v_turn public.campaign_turns%rowtype;
  v_player public.campaign_players%rowtype;
  v_participant public.battle_participants%rowtype;
  v_other_dragon_commits int := 0;
  v_other_giant_commits int := 0;
begin
  submitted_dragon_recruits := coalesce(submitted_dragon_recruits, 0);
  submitted_giant_recruits := coalesce(submitted_giant_recruits, 0);
  if submitted_dragon_recruits < 0 or submitted_giant_recruits < 0 then
    return query select false, 'Les renforts engagés doivent être positifs.', null::int, null::int; return;
  end if;
  select * into v_battle from public.battles where id = target_battle_id for update;
  if not found then return query select false, 'Bataille introuvable.', null::int, null::int; return; end if;
  if v_battle.status <> 'pending' then return query select false, 'Cette bataille est déjà résolue.', null::int, null::int; return; end if;
  select * into v_campaign from public.campaigns where id = v_battle.campaign_id for update;
  if not found then return query select false, 'Campagne introuvable.', null::int, null::int; return; end if;
  if v_campaign.status <> 'active' or v_campaign.current_phase <> 'resolving' then
    return query select false, 'Les renforts se choisissent pendant la résolution.', null::int, null::int; return;
  end if;
  select * into v_turn from public.campaign_turns where id = v_battle.turn_id for update;
  if not found or v_turn.phase <> 'resolving' then
    return query select false, 'Le tour courant doit être en résolution.', null::int, null::int; return;
  end if;
  select * into v_player from public.campaign_players where campaign_id = v_battle.campaign_id and user_id = auth.uid() and status = 'active' for update;
  if not found then return query select false, 'Joueur introuvable dans cette campagne.', null::int, null::int; return; end if;
  select * into v_participant from public.battle_participants where battle_id = v_battle.id and campaign_player_id = v_player.id for update;
  if not found then return query select false, 'Tu ne participes pas à cette bataille.', null::int, null::int; return; end if;
  select coalesce(sum(bp.dragon_recruits_committed), 0)::int, coalesce(sum(bp.giant_recruits_committed), 0)::int
  into v_other_dragon_commits, v_other_giant_commits
  from public.battle_participants bp
  join public.battles b on b.id = bp.battle_id
  where bp.campaign_player_id = v_player.id and b.turn_id = v_battle.turn_id and b.id <> v_battle.id and b.status <> 'cancelled';
  if submitted_dragon_recruits > greatest(v_player.dragon_recruits - v_other_dragon_commits, 0) then
    return query select false, 'Pas assez de Dragons disponibles pour ce tour.', null::int, null::int; return;
  end if;
  if submitted_giant_recruits > greatest(v_player.giant_recruits - v_other_giant_commits, 0) then
    return query select false, 'Pas assez de Géants disponibles pour ce tour.', null::int, null::int; return;
  end if;
  update public.battle_participants bp
  set dragon_recruits_committed = submitted_dragon_recruits,
      giant_recruits_committed = submitted_giant_recruits
  where bp.id = v_participant.id;
  return query select true, null::text, submitted_dragon_recruits, submitted_giant_recruits;
end;
$commit_legendary_reinforcements$;

grant execute on function public.commit_legendary_reinforcements(uuid, int, int) to authenticated;
