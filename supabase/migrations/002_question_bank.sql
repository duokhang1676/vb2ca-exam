alter table public.exams
  add column if not exists exam_code text,
  add column if not exists source text;

alter table public.exams
  drop constraint if exists exams_exam_code_check;
alter table public.exams
  add constraint exams_exam_code_check
  check (exam_code is null or exam_code in ('CA1', 'CA4'));

alter table public.exams
  drop constraint if exists exams_source_check;
alter table public.exams
  add constraint exams_source_check
  check (source is null or source in ('random', 'sample'));

create table if not exists public.essays (
  id uuid primary key default gen_random_uuid(),
  prompt text not null,
  fingerprint text not null unique,
  source_filename text,
  created_at timestamptz not null default now()
);

create table if not exists public.questions (
  id uuid primary key default gen_random_uuid(),
  exam_code text not null check (exam_code in ('CA1', 'CA4')),
  type text not null check (type in ('mcq', 'fill')),
  stem text not null,
  options jsonb,
  answer text not null,
  fingerprint text not null,
  created_at timestamptz not null default now(),
  unique (exam_code, fingerprint)
);

create index if not exists questions_exam_code_idx on public.questions (exam_code);
create index if not exists questions_exam_code_type_idx on public.questions (exam_code, type);
create index if not exists exams_exam_code_idx on public.exams (exam_code);

alter table public.essays enable row level security;
alter table public.questions enable row level security;

drop policy if exists "essays_select_all" on public.essays;
create policy "essays_select_all" on public.essays for select using (true);
drop policy if exists "essays_insert_all" on public.essays;
create policy "essays_insert_all" on public.essays for insert with check (true);

drop policy if exists "questions_select_all" on public.questions;
create policy "questions_select_all" on public.questions for select using (true);
drop policy if exists "questions_insert_all" on public.questions;
create policy "questions_insert_all" on public.questions for insert with check (true);

update storage.buckets
set allowed_mime_types = array[
  'application/pdf',
  'text/plain',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword'
]
where id = 'exam-uploads';
