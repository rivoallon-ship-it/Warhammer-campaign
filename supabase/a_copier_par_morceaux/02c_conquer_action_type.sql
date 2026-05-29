do $$
declare
  v_constraint_name text;
begin
  select conname
  into v_constraint_name
  from pg_constraint
  where conrelid = 'public.orders'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) like '%action_type%'
  limit 1;

  if v_constraint_name is not null then
    execute format('alter table public.orders drop constraint %I', v_constraint_name);
  end if;

  update public.orders
  set action_type = 'conquer'
  where action_type in ('attack', 'explore');

  alter table public.orders
    add constraint orders_action_type_check
    check (action_type in ('conquer', 'fortify'));
end;
$$;
