alter table public.essays
  add column if not exists title text;

update public.essays
set title = left(prompt, 80)
where title is null or btrim(title) = '';

alter table public.nlxh_practice_attempts
  drop constraint if exists nlxh_practice_attempts_path_mode_check;

alter table public.nlxh_practice_attempts
  add constraint nlxh_practice_attempts_path_mode_check
  check (path_mode in ('guided', 'free', 'daily', 'remedial', 'review'));

create table if not exists public.nlxh_guides (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  storage_path text not null unique,
  mime text not null,
  original_name text not null,
  created_by uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists nlxh_guides_created_at_idx
  on public.nlxh_guides (created_at desc);

alter table public.nlxh_guides enable row level security;

drop policy if exists "nlxh_guides_select_auth" on public.nlxh_guides;
create policy "nlxh_guides_select_auth"
  on public.nlxh_guides for select
  to authenticated
  using (true);

drop policy if exists "nlxh_guides_insert_own" on public.nlxh_guides;
create policy "nlxh_guides_insert_own"
  on public.nlxh_guides for insert
  to authenticated
  with check (auth.uid() = created_by);

drop policy if exists "nlxh_guides_delete_own" on public.nlxh_guides;
create policy "nlxh_guides_delete_own"
  on public.nlxh_guides for delete
  to authenticated
  using (auth.uid() = created_by);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'nlxh-guides',
  'nlxh-guides',
  true,
  15728640,
  array[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "nlxh_guides_objects_select" on storage.objects;
create policy "nlxh_guides_objects_select"
  on storage.objects for select
  using (bucket_id = 'nlxh-guides');

drop policy if exists "nlxh_guides_objects_insert" on storage.objects;
create policy "nlxh_guides_objects_insert"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'nlxh-guides');

drop policy if exists "nlxh_guides_objects_delete" on storage.objects;
create policy "nlxh_guides_objects_delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'nlxh-guides'
    and split_part(name, '/', 1) = auth.uid()::text
  );
