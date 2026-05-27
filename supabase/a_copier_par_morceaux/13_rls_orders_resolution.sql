drop policy if exists "Orders readable by owner before reveal and members after reveal" on public.orders;
create policy "Orders readable by owner before reveal and members after reveal"
on public.orders for select
to authenticated
using (
  public.owns_campaign_player(campaign_player_id)
  or (
    status in ('revealed', 'resolved')
    and public.is_active_campaign_member(campaign_id)
  )
);

drop policy if exists "Players insert their own orders" on public.orders;
create policy "Players insert their own orders"
on public.orders for insert
to authenticated
with check (
  public.owns_campaign_player(campaign_player_id)
  and public.is_active_campaign_member(campaign_id)
  and exists (
    select 1
    from public.campaigns c
    where c.id = campaign_id
      and c.current_phase = 'orders'
  )
);

drop policy if exists "Players update their own orders before reveal" on public.orders;
create policy "Players update their own orders before reveal"
on public.orders for update
to authenticated
using (
  public.owns_campaign_player(campaign_player_id)
  and status in ('draft', 'submitted')
)
with check (
  public.owns_campaign_player(campaign_player_id)
  and status in ('draft', 'submitted')
);

drop policy if exists "Game masters reveal and resolve orders" on public.orders;
create policy "Game masters reveal and resolve orders"
on public.orders for update
to authenticated
using (public.is_campaign_master(campaign_id))
with check (public.is_campaign_master(campaign_id));

drop policy if exists "Battles readable by active members" on public.battles;
create policy "Battles readable by active members"
on public.battles for select
to authenticated
using (public.is_active_campaign_member(campaign_id));

drop policy if exists "Game masters insert battles" on public.battles;
create policy "Game masters insert battles"
on public.battles for insert
to authenticated
with check (public.is_campaign_master(campaign_id));

drop policy if exists "Game masters update battles" on public.battles;
create policy "Game masters update battles"
on public.battles for update
to authenticated
using (public.is_campaign_master(campaign_id))
with check (public.is_campaign_master(campaign_id));

drop policy if exists "Explorations readable by active members" on public.explorations;
create policy "Explorations readable by active members"
on public.explorations for select
to authenticated
using (public.is_active_campaign_member(campaign_id));

drop policy if exists "Game masters insert explorations" on public.explorations;
create policy "Game masters insert explorations"
on public.explorations for insert
to authenticated
with check (public.is_campaign_master(campaign_id));

