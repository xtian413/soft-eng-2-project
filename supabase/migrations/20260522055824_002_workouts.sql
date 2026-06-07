-- Enable RLS and owner-only policies for workouts
alter table public.workouts enable row level security;

create policy "Workouts are owner readable" on public.workouts
	for select
	using (auth.uid() = user_id);

create policy "Workouts are owner insertable" on public.workouts
	for insert
	with check (auth.uid() = user_id);

create policy "Workouts are owner updatable" on public.workouts
	for update
	using (auth.uid() = user_id)
	with check (auth.uid() = user_id);

create policy "Workouts are owner deletable" on public.workouts
	for delete
	using (auth.uid() = user_id);

