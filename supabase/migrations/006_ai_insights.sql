-- ai_insights table
create table if not exists public.ai_insights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  context_type text not null,
  context_id uuid,
  insight_text text not null,
  generated_at timestamptz default now()
);

alter table public.ai_insights enable row level security;

create policy "ai_insights_select_own" on public.ai_insights
  for select
  using (user_id = auth.uid());

create policy "ai_insights_insert_own" on public.ai_insights
  for insert
  with check (user_id = auth.uid());
