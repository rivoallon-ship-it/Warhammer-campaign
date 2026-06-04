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

drop policy if exists "Players update their lobby settings" on public.campaign_players;
create policy "Players update their lobby settings"
on public.campaign_players for update
to authenticated
using (
  user_id = auth.uid()
  and exists (
    select 1
    from public.campaigns c
    where c.id = campaign_id
      and c.status = 'lobby'
  )
)
with check (
  user_id = auth.uid()
  and public.campaign_player_keeps_identity(id, campaign_id, user_id, role, status)
);

drop policy if exists "Game masters update campaign players" on public.campaign_players;
create policy "Game masters update campaign players"
on public.campaign_players for update
to authenticated
using (public.is_campaign_master(campaign_id))
with check (public.is_campaign_master(campaign_id));

drop policy if exists "Game masters delete campaign players" on public.campaign_players;
create policy "Game masters delete campaign players"
on public.campaign_players for delete
to authenticated
using (public.is_campaign_master(campaign_id));
