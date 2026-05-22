-- body_progress table
create table if not exists public.body_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  weight_kg numeric not null,
  body_fat_pct numeric,
  recorded_at timestamptz not null
);

alter table public.body_progress enable row level security;

create policy "body_progress_select_own" on public.body_progress
  for select
  using (user_id = auth.uid());

create policy "body_progress_insert_own" on public.body_progress
  for insert
  with check (user_id = auth.uid());

create policy "body_progress_update_own" on public.body_progress
  for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "body_progress_delete_own" on public.body_progress
  for delete
  using (user_id = auth.uid());
