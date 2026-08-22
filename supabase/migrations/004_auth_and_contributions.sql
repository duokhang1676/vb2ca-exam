create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '',
  avatar_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.contributions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('essay', 'questions')),
  exam_code text check (exam_code is null or exam_code in ('CA1', 'CA4')),
  source_filename text,
  answer_filename text,
  added_count integer not null default 0,
  skipped_count integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists contributions_user_id_created_at_idx
  on public.contributions (user_id, created_at desc);

create table if not exists public.contribution_drafts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('essay', 'questions')),
  exam_code text check (exam_code is null or exam_code in ('CA1', 'CA4')),
  source_filename text,
  answer_filename text,
  payload jsonb not null,
  expires_at timestamptz not null default (now() + interval '2 hours'),
  created_at timestamptz not null default now()
);

create index if not exists contribution_drafts_user_id_idx
  on public.contribution_drafts (user_id);

alter table public.attempts
  add column if not exists user_id uuid references auth.users (id) on delete set null;

create index if not exists attempts_user_id_started_at_idx
  on public.attempts (user_id, started_at desc);

alter table public.essays
  add column if not exists created_by uuid references auth.users (id) on delete set null,
  add column if not exists contribution_id uuid references public.contributions (id) on delete set null;

alter table public.questions
  add column if not exists created_by uuid references auth.users (id) on delete set null,
  add column if not exists contribution_id uuid references public.contributions (id) on delete set null;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(
      nullif(new.raw_user_meta_data->>'display_name', ''),
      split_part(new.email, '@', 1),
      'Học viên'
    )
  );
  return new;
end;
$$;

revoke all on function public.handle_new_user() from public;
revoke all on function public.handle_new_user() from anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.contributions enable row level security;
alter table public.contribution_drafts enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists "contributions_select_own" on public.contributions;
create policy "contributions_select_own"
  on public.contributions for select
  using (auth.uid() = user_id);

drop policy if exists "contribution_drafts_select_own" on public.contribution_drafts;
create policy "contribution_drafts_select_own"
  on public.contribution_drafts for select
  using (auth.uid() = user_id);

drop policy if exists "contribution_drafts_update_own" on public.contribution_drafts;
create policy "contribution_drafts_update_own"
  on public.contribution_drafts for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "attempts_select_all" on public.attempts;
drop policy if exists "attempts_insert_all" on public.attempts;
drop policy if exists "attempts_update_all" on public.attempts;

drop policy if exists "attempts_select_own" on public.attempts;
create policy "attempts_select_own"
  on public.attempts for select
  using (auth.uid() = user_id);

drop policy if exists "attempts_update_own" on public.attempts;
create policy "attempts_update_own"
  on public.attempts for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "essays_insert_all" on public.essays;
drop policy if exists "questions_insert_all" on public.questions;
drop policy if exists "question_clusters_insert_all" on public.question_clusters;
drop policy if exists "exams_insert_all" on public.exams;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  2097152,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "avatars_select_public" on storage.objects;
create policy "avatars_select_public"
  on storage.objects for select
  using (bucket_id = 'avatars');

drop policy if exists "avatars_insert_own" on storage.objects;
create policy "avatars_insert_own"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and split_part(name, '/', 1) = auth.uid()::text
  );

drop policy if exists "avatars_update_own" on storage.objects;
create policy "avatars_update_own"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'avatars'
    and split_part(name, '/', 1) = auth.uid()::text
  )
  with check (
    bucket_id = 'avatars'
    and split_part(name, '/', 1) = auth.uid()::text
  );
