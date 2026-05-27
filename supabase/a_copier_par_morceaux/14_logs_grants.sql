drop policy if exists "Game masters update explorations" on public.explorations;
create policy "Game masters update explorations"
on public.explorations for update
to authenticated
using (public.is_campaign_master(campaign_id))
with check (public.is_campaign_master(campaign_id));

drop policy if exists "Logs readable by campaign members" on public.campaign_logs;
create policy "Logs readable by campaign members"
on public.campaign_logs for select
to authenticated
using (public.is_campaign_member(campaign_id));

drop policy if exists "Owners and game masters insert logs" on public.campaign_logs;
create policy "Owners and game masters insert logs"
on public.campaign_logs for insert
to authenticated
with check (
  created_by_user_id = auth.uid()
  and (
    public.is_campaign_owner(campaign_id)
    or public.is_campaign_master(campaign_id)
  )
);

drop policy if exists "Campaign members insert join logs" on public.campaign_logs;
create policy "Campaign members insert join logs"
on public.campaign_logs for insert
to authenticated
with check (
  created_by_user_id = auth.uid()
  and type = 'player_joined'
  and public.is_campaign_member(campaign_id)
);

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.campaigns to authenticated;
grant select, insert, update, delete on public.campaign_players to authenticated;
grant select, insert, update, delete on public.territories to authenticated;
grant select, insert, update, delete on public.territory_adjacencies to authenticated;
grant select, insert, update, delete on public.campaign_turns to authenticated;
grant select, insert, update, delete on public.orders to authenticated;
grant select, insert, update, delete on public.battles to authenticated;
grant select, insert, update, delete on public.explorations to authenticated;
grant select, insert on public.campaign_logs to authenticated;

grant execute on function public.is_campaign_owner(uuid) to authenticated;
grant execute on function public.is_campaign_member(uuid) to authenticated;
grant execute on function public.is_active_campaign_member(uuid) to authenticated;
grant execute on function public.is_campaign_master(uuid) to authenticated;
grant execute on function public.owns_campaign_player(uuid) to authenticated;
grant execute on function public.campaign_player_keeps_identity(uuid, uuid, uuid, text, text) to authenticated;
grant execute on function public.get_current_turn_order_visibility(uuid) to authenticated;
grant execute on function public.reveal_current_turn_orders(uuid) to authenticated;
grant execute on function public.resolve_exploration_result(uuid, int) to authenticated;
grant execute on function public.resolve_battle_result(uuid, uuid, text) to authenticated;
grant execute on function public.finish_current_turn(uuid) to authenticated;
