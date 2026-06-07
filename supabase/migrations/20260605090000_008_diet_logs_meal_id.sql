alter table public.diet_logs
  add column if not exists meal_id text;

update public.diet_logs
set meal_id = 'breakfast'
where meal_id is null;

alter table public.diet_logs
  alter column meal_id set default 'breakfast';

alter table public.diet_logs
  alter column meal_id set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'diet_logs_meal_id_check'
      and conrelid = 'public.diet_logs'::regclass
  ) then
    alter table public.diet_logs
      add constraint diet_logs_meal_id_check
      check (meal_id in ('breakfast', 'lunch', 'dinner', 'snack'));
  end if;
end $$;
