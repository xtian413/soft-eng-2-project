create table if not exists public.routines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  routine_name text not null,
  created_at timestamptz not null default now()
);

create index if not exists routines_user_id_idx on public.routines(user_id);

alter table public.routines enable row level security;

create policy "Routines are owner readable" on public.routines
  for select
  using (auth.uid() = user_id);

create policy "Routines are owner insertable" on public.routines
  for insert
  with check (auth.uid() = user_id);

create policy "Routines are owner updatable" on public.routines
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Routines are owner deletable" on public.routines
  for delete
  using (auth.uid() = user_id);
