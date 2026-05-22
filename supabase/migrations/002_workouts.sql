-- workouts table
create table if not exists public.workouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  name text not null,
  notes text,
  performed_at timestamptz not null,
  created_at timestamptz default now()
);

alter table public.workouts enable row level security;

create policy "workouts_select_own" on public.workouts
  for select
  using (user_id = auth.uid());

create policy "workouts_insert_own" on public.workouts
  for insert
  with check (user_id = auth.uid());

create policy "workouts_update_own" on public.workouts
  for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "workouts_delete_own" on public.workouts
  for delete
  using (user_id = auth.uid());
