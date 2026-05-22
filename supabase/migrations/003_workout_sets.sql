-- workout_sets table
create table if not exists public.workout_sets (
  id uuid primary key default gen_random_uuid(),
  workout_id uuid not null references public.workouts(id) on delete cascade,
  exercise_name text not null,
  set_number integer not null,
  reps integer,
  weight_kg numeric,
  duration_seconds integer
);

alter table public.workout_sets enable row level security;

create policy "workout_sets_select_own" on public.workout_sets
  for select
  using (
    exists (
      select 1
      from public.workouts w
      where w.id = workout_sets.workout_id
        and w.user_id = auth.uid()
    )
  );

create policy "workout_sets_insert_own" on public.workout_sets
  for insert
  with check (
    exists (
      select 1
      from public.workouts w
      where w.id = workout_sets.workout_id
        and w.user_id = auth.uid()
    )
  );

create policy "workout_sets_update_own" on public.workout_sets
  for update
  using (
    exists (
      select 1
      from public.workouts w
      where w.id = workout_sets.workout_id
        and w.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.workouts w
      where w.id = workout_sets.workout_id
        and w.user_id = auth.uid()
    )
  );

create policy "workout_sets_delete_own" on public.workout_sets
  for delete
  using (
    exists (
      select 1
      from public.workouts w
      where w.id = workout_sets.workout_id
        and w.user_id = auth.uid()
    )
  );
