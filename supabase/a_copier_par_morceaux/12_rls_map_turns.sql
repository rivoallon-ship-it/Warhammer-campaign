drop policy if exists "Territories readable by campaign members" on public.territories;
create policy "Territories readable by campaign members"
on public.territories for select
to authenticated
using (public.is_campaign_member(campaign_id));

drop policy if exists "Game masters insert territories" on public.territories;
create policy "Game masters insert territories"
on public.territories for insert
to authenticated
with check (public.is_campaign_master(campaign_id));

drop policy if exists "Game masters update territories" on public.territories;
create policy "Game masters update territories"
on public.territories for update
to authenticated
using (public.is_campaign_master(campaign_id))
with check (public.is_campaign_master(campaign_id));

drop policy if exists "Game masters delete territories" on public.territories;
create policy "Game masters delete territories"
on public.territories for delete
to authenticated
using (public.is_campaign_master(campaign_id));

drop policy if exists "Adjacencies readable by campaign members" on public.territory_adjacencies;
create policy "Adjacencies readable by campaign members"
on public.territory_adjacencies for select
to authenticated
using (public.is_campaign_member(campaign_id));

drop policy if exists "Game masters insert adjacencies" on public.territory_adjacencies;
create policy "Game masters insert adjacencies"
on public.territory_adjacencies for insert
to authenticated
with check (public.is_campaign_master(campaign_id));

drop policy if exists "Game masters delete adjacencies" on public.territory_adjacencies;
create policy "Game masters delete adjacencies"
on public.territory_adjacencies for delete
to authenticated
using (public.is_campaign_master(campaign_id));

drop policy if exists "Turns readable by campaign members" on public.campaign_turns;
create policy "Turns readable by campaign members"
on public.campaign_turns for select
to authenticated
using (public.is_campaign_member(campaign_id));

drop policy if exists "Game masters insert turns" on public.campaign_turns;
create policy "Game masters insert turns"
on public.campaign_turns for insert
to authenticated
with check (public.is_campaign_master(campaign_id));

drop policy if exists "Game masters update turns" on public.campaign_turns;
create policy "Game masters update turns"
on public.campaign_turns for update
to authenticated
using (public.is_campaign_master(campaign_id))
with check (public.is_campaign_master(campaign_id));

