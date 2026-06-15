create table if not exists public.campaign_messages (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  campaign_player_id uuid not null,
  recipient_campaign_player_id uuid,
  body text not null check (char_length(trim(body)) between 1 and 800),
  created_at timestamptz not null default now(),
  constraint campaign_messages_campaign_player_fk
    foreign key (campaign_id, campaign_player_id)
    references public.campaign_players(campaign_id, id)
    on delete cascade,
  constraint campaign_messages_recipient_campaign_player_fk
    foreign key (campaign_id, recipient_campaign_player_id)
    references public.campaign_players(campaign_id, id)
    on delete cascade
);

create index if not exists campaign_messages_campaign_id_created_at_idx
on public.campaign_messages(campaign_id, created_at desc);

create index if not exists campaign_messages_recipient_created_at_idx
on public.campaign_messages(campaign_id, recipient_campaign_player_id, created_at desc);

alter table public.campaign_messages enable row level security;

drop policy if exists "Messages readable by active campaign members"
on public.campaign_messages;
drop policy if exists "Diplomacy messages readable by participants"
on public.campaign_messages;

create policy "Diplomacy messages readable by participants"
on public.campaign_messages for select
to authenticated
using (
  exists (
    select 1 from public.campaign_players cp
    where cp.campaign_id = campaign_messages.campaign_id
      and cp.user_id = auth.uid()
      and cp.status = 'active'
      and cp.id in (campaign_messages.campaign_player_id, campaign_messages.recipient_campaign_player_id)
  )
);

drop policy if exists "Active players insert their own messages"
on public.campaign_messages;
drop policy if exists "Active players insert their own diplomacy messages"
on public.campaign_messages;

create policy "Active players insert their own diplomacy messages"
on public.campaign_messages for insert
to authenticated
with check (
  recipient_campaign_player_id is not null
  and campaign_player_id <> recipient_campaign_player_id
  and char_length(trim(body)) between 1 and 800
  and exists (select 1 from public.campaign_players author where author.id = campaign_player_id and author.campaign_id = campaign_messages.campaign_id and author.user_id = auth.uid() and author.status = 'active')
  and exists (select 1 from public.campaign_players recipient where recipient.id = recipient_campaign_player_id and recipient.campaign_id = campaign_messages.campaign_id and recipient.status = 'active')
);

grant select, insert on public.campaign_messages to authenticated;
