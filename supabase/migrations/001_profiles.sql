-- profiles table
create table if not exists public.profiles (
  id uuid primary key references auth.users(id),
  full_name text,
  height_cm numeric,
  goal text,
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_own" on public.profiles
  for select
  using (id = auth.uid());

create policy "profiles_insert_own" on public.profiles
  for insert
  with check (id = auth.uid());

create policy "profiles_update_own" on public.profiles
  for update
  using (id = auth.uid())
  with check (id = auth.uid());

create policy "profiles_delete_own" on public.profiles
  for delete
  using (id = auth.uid());

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row
execute procedure public.handle_new_user();
