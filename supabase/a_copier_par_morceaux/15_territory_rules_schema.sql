alter table public.territories
  add column if not exists special_reward_claimed_at timestamptz;

do $$
declare
  v_constraint_name text;
begin
  select conname
  into v_constraint_name
  from pg_constraint
  where conrelid = 'public.territories'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) like '%type%'
  limit 1;

  if v_constraint_name is not null then
    execute format('alter table public.territories drop constraint %I', v_constraint_name);
  end if;

  alter table public.territories
    add constraint territories_type_check
    check (type in ('capital', 'village', 'mine', 'ruins', 'fort', 'magic_tower', 'dragon', 'giant', 'wild'));
end;
$$;
