alter table public.profiles enable row level security;
alter table public.campaigns enable row level security;
alter table public.campaign_players enable row level security;
alter table public.territories enable row level security;
alter table public.territory_adjacencies enable row level security;
alter table public.campaign_turns enable row level security;
alter table public.orders enable row level security;
alter table public.battles enable row level security;
alter table public.battle_participants enable row level security;
alter table public.explorations enable row level security;
alter table public.campaign_logs enable row level security;

drop policy if exists "Profiles are readable by authenticated users" on public.profiles;
create policy "Profiles are readable by authenticated users"
on public.profiles for select
to authenticated
using (true);

drop policy if exists "Users insert their own profile" on public.profiles;
create policy "Users insert their own profile"
on public.profiles for insert
to authenticated
with check (id = auth.uid());

drop policy if exists "Users update their own profile" on public.profiles;
create policy "Users update their own profile"
on public.profiles for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

drop policy if exists "Campaigns readable by members and lobby seekers" on public.campaigns;
create policy "Campaigns readable by members and lobby seekers"
on public.campaigns for select
to authenticated
using (
  owner_user_id = auth.uid()
  or public.is_campaign_member(id)
  or status = 'lobby'
);

drop policy if exists "Users create owned campaigns" on public.campaigns;
create policy "Users create owned campaigns"
on public.campaigns for insert
to authenticated
with check (owner_user_id = auth.uid());

drop policy if exists "Owners and game masters update campaigns" on public.campaigns;
create policy "Owners and game masters update campaigns"
on public.campaigns for update
to authenticated
using (owner_user_id = auth.uid() or public.is_campaign_master(id))
with check (owner_user_id = auth.uid() or public.is_campaign_master(id));

drop policy if exists "Owners delete campaigns" on public.campaigns;
create policy "Owners delete campaigns"
on public.campaigns for delete
to authenticated
using (owner_user_id = auth.uid());
