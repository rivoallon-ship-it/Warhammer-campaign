do $$
declare
  v_constraint record;
begin
  for v_constraint in
    select conname
    from pg_constraint
    where conrelid = 'public.campaign_turns'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) like '%army_base_points%'
  loop
    execute format('alter table public.campaign_turns drop constraint %I', v_constraint.conname);
  end loop;

  alter table public.campaign_turns
    add constraint campaign_turns_army_base_points_check
    check (army_base_points >= 0);

  for v_constraint in
    select conname
    from pg_constraint
    where conrelid = 'public.battles'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) like '%army_base_points%'
  loop
    execute format('alter table public.battles drop constraint %I', v_constraint.conname);
  end loop;

  alter table public.battles
    add constraint battles_army_base_points_check
    check (army_base_points >= 0);
end;
$$;

update public.campaign_turns
set army_base_points = least(greatest(turn_number - 1, 0) * 200, 2000);

update public.battles battle
set army_base_points = turn.army_base_points
from public.campaign_turns turn
where turn.id = battle.turn_id;
