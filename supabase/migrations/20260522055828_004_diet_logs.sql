CREATE TABLE IF NOT EXISTS public.diet_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  meal_id text not null default 'snack' check (meal_id in ('breakfast', 'lunch', 'dinner', 'snack')),
  meal_name text not null,
  food_name text,
  calories numeric,
  protein_g numeric,
  carbs_g numeric,
  fat_g numeric,
  logged_at timestamptz not null,
  created_at timestamptz not null default now()
);

-- Add micronutrient and serving columns the app expects
alter table public.diet_logs add column if not exists fiber_g numeric;
alter table public.diet_logs add column if not exists sodium_mg numeric;
alter table public.diet_logs add column if not exists potassium_mg numeric;
alter table public.diet_logs add column if not exists calcium_mg numeric;
alter table public.diet_logs add column if not exists iron_mg numeric;
alter table public.diet_logs add column if not exists vitamin_c_mg numeric;
alter table public.diet_logs add column if not exists folate_mcg numeric;
alter table public.diet_logs add column if not exists serving_size numeric;
alter table public.diet_logs add column if not exists serving_unit text;
alter table public.diet_logs add column if not exists source_food_id text;
