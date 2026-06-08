CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  height_cm numeric,
  weight_kg numeric,
  gender text,
  goal text check (goal in ('moderate_cut', 'aggressive_cut', 'maintain', 'lean_bulk', 'lose_weight', 'build_muscle')),
  age integer,
  activity_level text,
  target_weight_kg numeric,
  macro_protein_pct numeric,
  macro_carbs_pct numeric,
  macro_fats_pct numeric,
  created_at timestamptz not null default now()
);
