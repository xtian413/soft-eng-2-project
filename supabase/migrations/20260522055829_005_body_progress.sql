CREATE TABLE IF NOT EXISTS public.body_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  weight_kg numeric not null,
  recorded_at timestamptz not null,
  created_at timestamptz not null default now()
);

alter table public.body_progress add column if not exists body_fat_pct numeric;
