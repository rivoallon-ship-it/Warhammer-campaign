-- Correctif à exécuter dans Supabase avant de relancer le fichier complet.
-- Il crée la fonction utilisée par la policy "Players update their lobby settings".

create or replace function public.campaign_player_keeps_identity(
  target_campaign_player_id uuid,
  target_campaign_id uuid,
  target_user_id uuid,
  target_role text,
  target_status text
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.campaign_players cp
    where cp.id = target_campaign_player_id
      and cp.campaign_id = target_campaign_id
      and cp.user_id = target_user_id
      and cp.role = target_role
      and cp.status = target_status
  );
$$;

grant execute on function public.campaign_player_keeps_identity(uuid, uuid, uuid, text, text) to authenticated;
