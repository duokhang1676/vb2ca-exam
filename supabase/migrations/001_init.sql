create table public.exams (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  essay_prompt text not null,
  questions jsonb not null,
  answer_key jsonb not null,
  pdf_path text,
  answer_path text,
  created_at timestamptz not null default now()
);

create table public.attempts (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references public.exams(id) on delete cascade,
  shuffle jsonb not null,
  started_at timestamptz not null default now(),
  submitted_at timestamptz,
  essay_text text,
  answers jsonb not null default '{}'::jsonb,
  essay_score numeric,
  essay_feedback text,
  mcq_score numeric,
  mcq_detail jsonb,
  total_score numeric
);

create index attempts_exam_id_idx on public.attempts (exam_id);

alter table public.exams enable row level security;
alter table public.attempts enable row level security;

create policy "exams_select_all" on public.exams for select using (true);
create policy "exams_insert_all" on public.exams for insert with check (true);
create policy "attempts_select_all" on public.attempts for select using (true);
create policy "attempts_insert_all" on public.attempts for insert with check (true);
create policy "attempts_update_all" on public.attempts for update using (true) with check (true);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'exam-uploads',
  'exam-uploads',
  false,
  20971520,
  array['application/pdf', 'text/plain']
);

create policy "exam_uploads_insert"
  on storage.objects for insert
  with check (bucket_id = 'exam-uploads');

create policy "exam_uploads_select"
  on storage.objects for select
  using (bucket_id = 'exam-uploads');
