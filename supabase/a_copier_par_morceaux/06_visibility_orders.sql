create or replace function public.get_current_turn_order_visibility(
  target_campaign_id uuid
)
returns table (
  campaign_player_id uuid,
  display_name text,
  order_id uuid,
  order_status text,
  can_view_details boolean,
  action_type text,
  source_territory_id uuid,
  source_territory_code text,
  target_territory_id uuid,
  target_territory_code text,
  submitted_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  with campaign_context as (
    select c.*
    from public.campaigns c
    where c.id = target_campaign_id
      and public.is_active_campaign_member(c.id)
  ),
  current_turn as (
    select ct.*
    from public.campaign_turns ct
    join campaign_context c on c.id = ct.campaign_id
    where ct.turn_number = c.current_turn_number
    order by ct.started_at desc
    limit 1
  ),
  visible_orders as (
    select
      o.*,
      (
        public.owns_campaign_player(o.campaign_player_id)
        or o.status in ('revealed', 'resolved')
      ) as can_view_details
    from public.orders o
    join current_turn ct on ct.id = o.turn_id
  )
  select
    cp.id as campaign_player_id,
    cp.display_name,
    vo.id as order_id,
    coalesce(vo.status, 'pending') as order_status,
    coalesce(vo.can_view_details, false) as can_view_details,
    case when vo.can_view_details then vo.action_type else null end as action_type,
    case
      when vo.can_view_details then vo.source_territory_id
      else null
    end as source_territory_id,
    case when vo.can_view_details then source.code else null end as source_territory_code,
    case
      when vo.can_view_details then vo.target_territory_id
      else null
    end as target_territory_id,
    case when vo.can_view_details then target.code else null end as target_territory_code,
    case when vo.can_view_details then vo.submitted_at else null end as submitted_at
  from campaign_context c
  join public.campaign_players cp
    on cp.campaign_id = c.id
    and cp.status = 'active'
  left join visible_orders vo on vo.campaign_player_id = cp.id
  left join public.territories source on source.id = vo.source_territory_id
  left join public.territories target on target.id = vo.target_territory_id
  order by cp.created_at asc;
$$;

