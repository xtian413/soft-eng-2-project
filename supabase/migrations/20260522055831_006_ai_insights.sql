CREATE TABLE IF NOT EXISTS public.ai_insights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  context_type text check (context_type in ('workout', 'diet', 'progress', 'chat')),
  context_id uuid,
  insight_text text,
  generated_at timestamptz not null default now()
);

-- Add columns the LocalAiInsight interface expects
alter table public.ai_insights add column if not exists title text;
alter table public.ai_insights add column if not exists summary text;
alter table public.ai_insights add column if not exists nutrition text;
alter table public.ai_insights add column if not exists training text;
alter table public.ai_insights add column if not exists next_step text;
alter table public.ai_insights add column if not exists confidence text;
alter table public.ai_insights add column if not exists payload_json jsonb;
