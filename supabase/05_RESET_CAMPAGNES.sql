-- Reset des campagnes a copier dans Supabase SQL Editor.
-- Ce script supprime les campagnes et toutes leurs donnees de jeu liees.
-- Il ne supprime pas les comptes auth.users ni les profils public.profiles.

begin;

delete from public.battle_participants
where campaign_id in (select id from public.campaigns);

delete from public.explorations
where campaign_id in (select id from public.campaigns);

delete from public.battles
where campaign_id in (select id from public.campaigns);

delete from public.orders
where campaign_id in (select id from public.campaigns);

delete from public.campaign_logs
where campaign_id in (select id from public.campaigns);

delete from public.territory_adjacencies
where campaign_id in (select id from public.campaigns);

delete from public.campaign_turns
where campaign_id in (select id from public.campaigns);

delete from public.territories
where campaign_id in (select id from public.campaigns);

delete from public.campaign_players
where campaign_id in (select id from public.campaigns);

delete from public.campaigns;

commit;
