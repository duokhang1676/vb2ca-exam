alter table public.attempts
  add column if not exists flagged jsonb not null default '[]'::jsonb;

alter table public.attempts
  add column if not exists essay_flagged boolean not null default false;

alter table public.attempts
  add column if not exists section_mode text not null default 'full';

alter table public.attempts
  drop constraint if exists attempts_section_mode_check;
alter table public.attempts
  add constraint attempts_section_mode_check
  check (section_mode in ('full', 'part1', 'part2'));

create table if not exists public.question_marks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('essay', 'question')),
  fingerprint text not null,
  exam_code text check (exam_code is null or exam_code in ('CA1', 'CA4')),
  created_at timestamptz not null default now(),
  unique (user_id, kind, fingerprint)
);

create index if not exists question_marks_user_id_idx
  on public.question_marks (user_id);

alter table public.question_marks enable row level security;

drop policy if exists "question_marks_select_own" on public.question_marks;
create policy "question_marks_select_own"
  on public.question_marks for select
  using (auth.uid() = user_id);

drop policy if exists "question_marks_insert_own" on public.question_marks;
create policy "question_marks_insert_own"
  on public.question_marks for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "question_marks_delete_own" on public.question_marks;
create policy "question_marks_delete_own"
  on public.question_marks for delete
  using (auth.uid() = user_id);
