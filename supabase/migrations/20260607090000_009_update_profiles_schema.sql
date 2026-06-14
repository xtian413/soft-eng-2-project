-- Add new columns to public.profiles if they do not exist
alter table public.profiles
  add column if not exists age integer,
  add column if not exists activity_level text,
  add column if not exists target_weight_kg numeric,
  add column if not exists macro_protein_pct numeric,
  add column if not exists macro_carbs_pct numeric,
  add column if not exists macro_fats_pct numeric;

-- Drop existing goal check constraint if it exists
alter table public.profiles
  drop constraint if exists profiles_goal_check;

-- Add updated check constraint to support the new goals
alter table public.profiles
  add constraint profiles_goal_check
  check (goal in ('moderate_cut', 'aggressive_cut', 'maintain', 'lean_bulk', 'lose_weight', 'build_muscle'));

-- Drop and recreate the handle_new_user trigger function to populate and upsert all new fields on auth signup
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
    target_weight_kg
  )
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    (new.raw_user_meta_data->>'height_cm')::numeric,
    new.raw_user_meta_data->>'goal',
    new.raw_user_meta_data->>'gender',
    (new.raw_user_meta_data->>'age')::integer,
    new.raw_user_meta_data->>'activity_level',
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

-- Recreate the trigger on auth.users
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
