create or replace function public.is_campaign_member(target_campaign_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1
    from public.campaign_players cp
    where cp.campaign_id = target_campaign_id
      and cp.user_id = auth.uid()
      and cp.status in ('pending', 'active')
  );
$$;

drop policy if exists "Campaigns readable by members and lobby seekers"
on public.campaigns;
drop policy if exists "Campaigns readable by members"
on public.campaigns;

create policy "Campaigns readable by members"
on public.campaigns for select
to authenticated
using (
  owner_user_id = auth.uid()
  or public.is_campaign_member(id)
);

drop policy if exists "Campaign players readable by campaign context"
on public.campaign_players;
drop policy if exists "Campaign players readable by campaign members"
on public.campaign_players;

create policy "Campaign players readable by campaign members"
on public.campaign_players for select
to authenticated
using (
  user_id = auth.uid()
  or public.is_campaign_member(campaign_id)
);

grant execute on function public.is_campaign_member(uuid) to authenticated;
