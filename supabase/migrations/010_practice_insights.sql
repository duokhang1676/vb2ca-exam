alter table public.profiles
  add column if not exists practice_insight jsonb,
  add column if not exists practice_insight_at timestamptz,
  add column if not exists practice_insight_hash text;
