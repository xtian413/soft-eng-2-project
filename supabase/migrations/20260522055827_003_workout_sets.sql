-- Enable RLS and policies for workout_sets that enforce ownership via workouts.user_id
alter table public.workout_sets enable row level security;

create policy "Workout_sets are owner readable" on public.workout_sets
	for select
	using (
		exists(
			select 1 from public.workouts w where w.id = workout_sets.workout_id and w.user_id = auth.uid()
		)
	);

create policy "Workout_sets are owner insertable" on public.workout_sets
	for insert
	with check (
		exists(
			select 1 from public.workouts w where w.id = workout_sets.workout_id and w.user_id = auth.uid()
		)
	);

create policy "Workout_sets are owner updatable" on public.workout_sets
	for update
	using (
		exists(
			select 1 from public.workouts w where w.id = workout_sets.workout_id and w.user_id = auth.uid()
		)
	)
	with check (
		exists(
			select 1 from public.workouts w where w.id = workout_sets.workout_id and w.user_id = auth.uid()
		)
	);

create policy "Workout_sets are owner deletable" on public.workout_sets
	for delete
	using (
		exists(
			select 1 from public.workouts w where w.id = workout_sets.workout_id and w.user_id = auth.uid()
		)
	);

