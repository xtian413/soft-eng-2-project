-- Add starting_weight_kg and current_weight_kg to public.profiles
alter table public.profiles
  add column if not exists starting_weight_kg numeric,
  add column if not exists current_weight_kg numeric;

-- Initialize existing rows from legacy weight_kg
update public.profiles set starting_weight_kg = weight_kg where starting_weight_kg is null;
update public.profiles set current_weight_kg = weight_kg where current_weight_kg is null;

-- Recreate the handle_new_user trigger function to populate starting/current weights on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (
    id,
    full_name,
    height_cm,
    goal,
    gender,
    age,
    activity_level,
    target_weight_kg,
    starting_weight_kg,
    current_weight_kg
  )
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    (new.raw_user_meta_data->>'height_cm')::numeric,
    new.raw_user_meta_data->>'goal',
    new.raw_user_meta_data->>'gender',
    (new.raw_user_meta_data->>'age')::integer,
    new.raw_user_meta_data->>'activity_level',
    (new.raw_user_meta_data->>'weight_kg')::numeric,
    (new.raw_user_meta_data->>'weight_kg')::numeric,
    (new.raw_user_meta_data->>'weight_kg')::numeric
  )
  on conflict (id) do update
  set
    full_name = excluded.full_name,
    height_cm = excluded.height_cm,
    goal = excluded.goal,
    gender = excluded.gender,
    age = excluded.age,
    activity_level = excluded.activity_level,
    target_weight_kg = excluded.target_weight_kg;
  return new;
end;
$$ language plpgsql security definer;

-- Ensure trigger exists on auth.users
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Create trigger to update profiles.current_weight_kg when new body_progress rows are inserted
create or replace function public.handle_body_progress_insert()
returns trigger as $$
begin
  update public.profiles
  set current_weight_kg = new.weight_kg,
      updated_at = now()
  where id = new.user_id;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_body_progress_insert on public.body_progress;
create trigger on_body_progress_insert
  after insert on public.body_progress
  for each row execute procedure public.handle_body_progress_insert();
