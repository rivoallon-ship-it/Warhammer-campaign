create table if not exists public.campaign_messages (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  campaign_player_id uuid not null,
  body text not null check (char_length(trim(body)) between 1 and 800),
  created_at timestamptz not null default now(),
  constraint campaign_messages_campaign_player_fk
    foreign key (campaign_id, campaign_player_id)
    references public.campaign_players(campaign_id, id)
    on delete cascade
);

create index if not exists campaign_messages_campaign_id_created_at_idx
on public.campaign_messages(campaign_id, created_at desc);

alter table public.campaign_messages enable row level security;

drop policy if exists "Messages readable by active campaign members"
on public.campaign_messages;

create policy "Messages readable by active campaign members"
on public.campaign_messages for select
to authenticated
using (public.is_active_campaign_member(campaign_id));

drop policy if exists "Active players insert their own messages"
on public.campaign_messages;

create policy "Active players insert their own messages"
on public.campaign_messages for insert
to authenticated
with check (
  public.owns_campaign_player(campaign_player_id)
  and public.is_active_campaign_member(campaign_id)
  and char_length(trim(body)) between 1 and 800
  and exists (
    select 1
    from public.campaign_players cp
    where cp.id = campaign_player_id
      and cp.campaign_id = campaign_messages.campaign_id
      and cp.user_id = auth.uid()
      and cp.status = 'active'
  )
);

grant select, insert on public.campaign_messages to authenticated;
