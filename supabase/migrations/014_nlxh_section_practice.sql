create table if not exists public.nlxh_section_packs (
  id uuid primary key default gen_random_uuid(),
  essay_id uuid references public.essays (id) on delete set null,
  essay_prompt text,
  essay_fingerprint text,
  hints jsonb not null,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.nlxh_section_pack_drafts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  payload jsonb not null,
  expires_at timestamptz not null default (now() + interval '4 hours'),
  created_at timestamptz not null default now()
);

create table if not exists public.nlxh_section_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  essay_id uuid references public.essays (id) on delete set null,
  essay_prompt text,
  sections text[] not null,
  answers jsonb not null default '{}'::jsonb,
  scores jsonb,
  feedback jsonb,
  hint_counts jsonb not null default '{}'::jsonb,
  section_pack_id uuid references public.nlxh_section_packs (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists nlxh_section_attempts_user_idx
  on public.nlxh_section_attempts (user_id, created_at desc);
create index if not exists nlxh_section_attempts_sections_idx
  on public.nlxh_section_attempts using gin (sections);
create index if not exists nlxh_section_packs_essay_idx
  on public.nlxh_section_packs (essay_id);
create index if not exists nlxh_section_pack_drafts_user_idx
  on public.nlxh_section_pack_drafts (user_id);

alter table public.nlxh_section_packs enable row level security;
alter table public.nlxh_section_pack_drafts enable row level security;
alter table public.nlxh_section_attempts enable row level security;

drop policy if exists "nlxh_section_packs_select_auth" on public.nlxh_section_packs;
create policy "nlxh_section_packs_select_auth"
  on public.nlxh_section_packs for select
  to authenticated
  using (true);

drop policy if exists "nlxh_section_attempts_select_own" on public.nlxh_section_attempts;
create policy "nlxh_section_attempts_select_own"
  on public.nlxh_section_attempts for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "nlxh_section_attempts_insert_own" on public.nlxh_section_attempts;
create policy "nlxh_section_attempts_insert_own"
  on public.nlxh_section_attempts for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "nlxh_section_pack_drafts_select_own" on public.nlxh_section_pack_drafts;
create policy "nlxh_section_pack_drafts_select_own"
  on public.nlxh_section_pack_drafts for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "nlxh_section_pack_drafts_insert_own" on public.nlxh_section_pack_drafts;
create policy "nlxh_section_pack_drafts_insert_own"
  on public.nlxh_section_pack_drafts for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "nlxh_section_pack_drafts_delete_own" on public.nlxh_section_pack_drafts;
create policy "nlxh_section_pack_drafts_delete_own"
  on public.nlxh_section_pack_drafts for delete
  to authenticated
  using (auth.uid() = user_id);
