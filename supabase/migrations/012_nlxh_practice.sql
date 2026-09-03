create table if not exists public.nlxh_question_analyses (
  id uuid primary key default gen_random_uuid(),
  essay_id uuid not null references public.essays (id) on delete cascade,
  question_type text not null check (
    question_type in ('D1_L1', 'D1_L2', 'D1_L3', 'D2_L1', 'D2_L2')
  ),
  main_topic text not null,
  core_issue text not null,
  keywords text[] not null default '{}',
  suggested_position text,
  framework_version text not null default 'framework_v1',
  source text not null check (source in ('gemini', 'external_pack', 'manual')),
  ai_model text,
  created_at timestamptz not null default now(),
  unique (essay_id, framework_version)
);

create table if not exists public.nlxh_exercise_seeds (
  id uuid primary key default gen_random_uuid(),
  essay_id uuid not null references public.essays (id) on delete cascade,
  practice_mode text not null,
  level integer not null default 1 check (level between 1 and 3),
  data jsonb not null,
  framework_version text not null default 'framework_v1',
  prompt_version text not null default 'core_v1',
  ai_model text,
  status text not null default 'valid' check (status in ('valid', 'invalid', 'needs_review')),
  created_at timestamptz not null default now(),
  unique (essay_id, practice_mode, level, framework_version, prompt_version)
);

create table if not exists public.nlxh_practice_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  essay_id uuid not null references public.essays (id) on delete cascade,
  practice_mode text not null,
  level integer not null default 1,
  exercise_seed_id uuid references public.nlxh_exercise_seeds (id) on delete set null,
  path_mode text not null default 'guided' check (
    path_mode in ('guided', 'free', 'daily', 'remedial')
  ),
  step_id text,
  answer jsonb not null default '{}'::jsonb,
  score numeric,
  rubric_scores jsonb,
  feedback jsonb,
  used_hint_count integer not null default 0,
  duration_seconds integer,
  word_count integer,
  created_at timestamptz not null default now()
);

create table if not exists public.nlxh_skill_progress (
  user_id uuid not null references auth.users (id) on delete cascade,
  skill text not null,
  attempts integer not null default 0,
  average_score numeric not null default 0,
  recent_average_score numeric not null default 0,
  best_score numeric not null default 0,
  mastery text not null default 'new' check (
    mastery in ('new', 'learning', 'familiar', 'mastered')
  ),
  updated_at timestamptz not null default now(),
  primary key (user_id, skill)
);

create table if not exists public.nlxh_path_enrollments (
  user_id uuid primary key references auth.users (id) on delete cascade,
  path_version text not null default 'path_v1',
  current_step_id text not null default 'm0',
  current_essay_id uuid references public.essays (id) on delete set null,
  remedial_skill text,
  remedial_return_step_id text,
  status text not null default 'active' check (status in ('active', 'completed')),
  updated_at timestamptz not null default now()
);

create table if not exists public.nlxh_reference_essays (
  id uuid primary key default gen_random_uuid(),
  essay_id uuid not null references public.essays (id) on delete cascade,
  framework_version text not null default 'framework_v1',
  essay text not null,
  outline text[] not null default '{}',
  source text not null check (source in ('gemini', 'external_pack', 'manual')),
  created_at timestamptz not null default now(),
  unique (essay_id, framework_version)
);

create table if not exists public.nlxh_ai_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  action text not null,
  model text,
  input_tokens integer,
  output_tokens integer,
  cached boolean not null default false,
  source text not null default 'gemini' check (
    source in ('gemini', 'external_pack', 'local')
  ),
  created_at timestamptz not null default now()
);

create table if not exists public.nlxh_pack_drafts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  payload jsonb not null,
  expires_at timestamptz not null default (now() + interval '4 hours'),
  created_at timestamptz not null default now()
);

create index if not exists nlxh_analyses_essay_idx
  on public.nlxh_question_analyses (essay_id);
create index if not exists nlxh_seeds_essay_mode_idx
  on public.nlxh_exercise_seeds (essay_id, practice_mode, level);
create index if not exists nlxh_attempts_user_created_idx
  on public.nlxh_practice_attempts (user_id, created_at desc);
create index if not exists nlxh_attempts_user_skill_idx
  on public.nlxh_practice_attempts (user_id, practice_mode, created_at desc);
create index if not exists nlxh_usage_created_idx
  on public.nlxh_ai_usage (created_at desc);
create index if not exists nlxh_pack_drafts_user_idx
  on public.nlxh_pack_drafts (user_id);

alter table public.nlxh_question_analyses enable row level security;
alter table public.nlxh_exercise_seeds enable row level security;
alter table public.nlxh_practice_attempts enable row level security;
alter table public.nlxh_skill_progress enable row level security;
alter table public.nlxh_path_enrollments enable row level security;
alter table public.nlxh_reference_essays enable row level security;
alter table public.nlxh_ai_usage enable row level security;
alter table public.nlxh_pack_drafts enable row level security;

drop policy if exists "nlxh_analyses_select_auth" on public.nlxh_question_analyses;
create policy "nlxh_analyses_select_auth"
  on public.nlxh_question_analyses for select
  to authenticated
  using (true);

drop policy if exists "nlxh_seeds_select_auth" on public.nlxh_exercise_seeds;
create policy "nlxh_seeds_select_auth"
  on public.nlxh_exercise_seeds for select
  to authenticated
  using (status = 'valid');

drop policy if exists "nlxh_reference_select_auth" on public.nlxh_reference_essays;
create policy "nlxh_reference_select_auth"
  on public.nlxh_reference_essays for select
  to authenticated
  using (true);

drop policy if exists "nlxh_attempts_select_own" on public.nlxh_practice_attempts;
create policy "nlxh_attempts_select_own"
  on public.nlxh_practice_attempts for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "nlxh_attempts_insert_own" on public.nlxh_practice_attempts;
create policy "nlxh_attempts_insert_own"
  on public.nlxh_practice_attempts for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "nlxh_attempts_update_own" on public.nlxh_practice_attempts;
create policy "nlxh_attempts_update_own"
  on public.nlxh_practice_attempts for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "nlxh_progress_select_own" on public.nlxh_skill_progress;
create policy "nlxh_progress_select_own"
  on public.nlxh_skill_progress for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "nlxh_progress_insert_own" on public.nlxh_skill_progress;
create policy "nlxh_progress_insert_own"
  on public.nlxh_skill_progress for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "nlxh_progress_update_own" on public.nlxh_skill_progress;
create policy "nlxh_progress_update_own"
  on public.nlxh_skill_progress for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "nlxh_enroll_select_own" on public.nlxh_path_enrollments;
create policy "nlxh_enroll_select_own"
  on public.nlxh_path_enrollments for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "nlxh_enroll_insert_own" on public.nlxh_path_enrollments;
create policy "nlxh_enroll_insert_own"
  on public.nlxh_path_enrollments for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "nlxh_enroll_update_own" on public.nlxh_path_enrollments;
create policy "nlxh_enroll_update_own"
  on public.nlxh_path_enrollments for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "nlxh_pack_drafts_select_own" on public.nlxh_pack_drafts;
create policy "nlxh_pack_drafts_select_own"
  on public.nlxh_pack_drafts for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "nlxh_pack_drafts_insert_own" on public.nlxh_pack_drafts;
create policy "nlxh_pack_drafts_insert_own"
  on public.nlxh_pack_drafts for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "nlxh_pack_drafts_update_own" on public.nlxh_pack_drafts;
create policy "nlxh_pack_drafts_update_own"
  on public.nlxh_pack_drafts for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "nlxh_pack_drafts_delete_own" on public.nlxh_pack_drafts;
create policy "nlxh_pack_drafts_delete_own"
  on public.nlxh_pack_drafts for delete
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "nlxh_usage_select_own" on public.nlxh_ai_usage;
create policy "nlxh_usage_select_own"
  on public.nlxh_ai_usage for select
  to authenticated
  using (auth.uid() = user_id);
