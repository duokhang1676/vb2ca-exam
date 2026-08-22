create table if not exists public.question_clusters (
  id uuid primary key default gen_random_uuid(),
  exam_code text not null check (exam_code in ('CA1', 'CA4')),
  kind text not null check (kind in ('passage', 'situation')),
  header_template text not null,
  passage text not null,
  fingerprint text not null,
  created_at timestamptz not null default now(),
  unique (exam_code, fingerprint)
);

create index if not exists question_clusters_exam_code_idx
  on public.question_clusters (exam_code);

alter table public.questions
  add column if not exists cluster_id uuid references public.question_clusters(id) on delete set null,
  add column if not exists cluster_position integer;

alter table public.questions
  drop constraint if exists questions_cluster_position_check;
alter table public.questions
  add constraint questions_cluster_position_check
  check (cluster_position is null or cluster_position between 1 and 3);

create index if not exists questions_cluster_id_idx on public.questions (cluster_id);

alter table public.question_clusters enable row level security;

drop policy if exists "question_clusters_select_all" on public.question_clusters;
create policy "question_clusters_select_all" on public.question_clusters for select using (true);
drop policy if exists "question_clusters_insert_all" on public.question_clusters;
create policy "question_clusters_insert_all" on public.question_clusters for insert with check (true);
