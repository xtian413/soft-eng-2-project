-- diet_logs table
create table if not exists public.diet_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  meal_name text not null,
  calories numeric,
  protein_g numeric,
  carbs_g numeric,
  fat_g numeric,
  logged_at timestamptz not null,
  created_at timestamptz default now()
);

alter table public.diet_logs enable row level security;

create policy "diet_logs_select_own" on public.diet_logs
  for select
  using (user_id = auth.uid());

create policy "diet_logs_insert_own" on public.diet_logs
  for insert
  with check (user_id = auth.uid());

create policy "diet_logs_update_own" on public.diet_logs
  for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "diet_logs_delete_own" on public.diet_logs
  for delete
  using (user_id = auth.uid());
