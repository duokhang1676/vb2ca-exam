alter table public.questions
  add column if not exists topic text,
  add column if not exists solution text;

alter table public.essays
  add column if not exists topic text,
  add column if not exists solution text;

alter table public.exams
  add column if not exists essay_topic text,
  add column if not exists essay_solution text;

alter table public.attempts
  add column if not exists show_topic boolean not null default false;
