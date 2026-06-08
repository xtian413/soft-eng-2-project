create table if not exists public.daily_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  bedtime text,
  waketime text,
  sleep_hours numeric,
  water_ml numeric,
  water_goal_ml numeric not null default 2000,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint daily_logs_user_date_unique unique (user_id, date),
  constraint daily_logs_sleep_hours_check check (sleep_hours is null or (sleep_hours >= 0 and sleep_hours <= 24)),
  constraint daily_logs_water_ml_check check (water_ml is null or water_ml >= 0),
  constraint daily_logs_water_goal_ml_check check (water_goal_ml > 0 and water_goal_ml <= 6000)
);

create index if not exists daily_logs_user_id_idx on public.daily_logs(user_id);
create index if not exists daily_logs_date_idx on public.daily_logs(date);
create index if not exists daily_logs_user_date_idx on public.daily_logs(user_id, date);
create index if not exists daily_logs_updated_at_idx on public.daily_logs(updated_at);
create index if not exists daily_logs_deleted_at_idx on public.daily_logs(deleted_at);

alter table public.daily_logs enable row level security;

create policy "Daily logs are owner readable" on public.daily_logs
  for select
  using (auth.uid() = user_id);

create policy "Daily logs are owner insertable" on public.daily_logs
  for insert
  with check (auth.uid() = user_id);

create policy "Daily logs are owner updatable" on public.daily_logs
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Daily logs are owner deletable" on public.daily_logs
  for delete
  using (auth.uid() = user_id);
