alter table public.body_progress
  add column if not exists recorded_date date,
  add column if not exists updated_at timestamptz not null default now();

update public.body_progress
set recorded_date = (recorded_at at time zone 'UTC')::date
where recorded_date is null;

alter table public.body_progress
  alter column recorded_date set not null;

do $$
begin
  if exists (
    select 1
    from public.body_progress
    group by user_id, recorded_date
    having count(*) > 1
  ) then
    raise exception
      'Duplicate body_progress rows exist for at least one user_id + recorded_date. Resolve duplicates before applying the daily unique index.';
  end if;
end $$;

create unique index if not exists body_progress_user_recorded_date_key
  on public.body_progress(user_id, recorded_date);

create index if not exists idx_body_progress_user_recorded_date
  on public.body_progress(user_id, recorded_date);

create index if not exists idx_body_progress_user_recorded_at
  on public.body_progress(user_id, recorded_at desc);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_body_progress_updated_at on public.body_progress;
create trigger set_body_progress_updated_at
  before update on public.body_progress
  for each row
  execute function public.set_updated_at();

alter table public.body_progress enable row level security;
alter table public.profiles enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'body_progress'
      and policyname = 'Body progress rows are owner readable'
  ) then
    create policy "Body progress rows are owner readable" on public.body_progress
      for select
      using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'body_progress'
      and policyname = 'Body progress rows are owner insertable'
  ) then
    create policy "Body progress rows are owner insertable" on public.body_progress
      for insert
      with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'body_progress'
      and policyname = 'Body progress rows are owner updatable'
  ) then
    create policy "Body progress rows are owner updatable" on public.body_progress
      for update
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'body_progress'
      and policyname = 'Body progress rows are owner deletable'
  ) then
    create policy "Body progress rows are owner deletable" on public.body_progress
      for delete
      using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'profiles'
      and policyname = 'Profiles are owner readable'
  ) then
    create policy "Profiles are owner readable" on public.profiles
      for select
      using (auth.uid() = id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'profiles'
      and policyname = 'Profiles are owner insertable'
  ) then
    create policy "Profiles are owner insertable" on public.profiles
      for insert
      with check (auth.uid() = id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'profiles'
      and policyname = 'Profiles are owner updatable'
  ) then
    create policy "Profiles are owner updatable" on public.profiles
      for update
      using (auth.uid() = id)
      with check (auth.uid() = id);
  end if;
end $$;
