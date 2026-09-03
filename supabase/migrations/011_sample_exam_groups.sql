create table if not exists public.sample_exam_groups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  exam_code text not null check (exam_code in ('CA1', 'CA4')),
  name text not null check (char_length(trim(name)) > 0),
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists sample_exam_groups_user_exam_idx
  on public.sample_exam_groups (user_id, exam_code, sort_order);

create table if not exists public.sample_exam_group_items (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.sample_exam_groups (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  exam_id uuid not null references public.exams (id) on delete cascade,
  section_mode text not null check (section_mode in ('full', 'part1', 'part2')),
  sort_order integer not null default 0,
  unique (user_id, exam_id, section_mode)
);

create index if not exists sample_exam_group_items_group_idx
  on public.sample_exam_group_items (group_id, sort_order);

alter table public.sample_exam_groups enable row level security;
alter table public.sample_exam_group_items enable row level security;

drop policy if exists "sample_exam_groups_select_own" on public.sample_exam_groups;
create policy "sample_exam_groups_select_own"
  on public.sample_exam_groups for select
  using (auth.uid() = user_id);

drop policy if exists "sample_exam_groups_insert_own" on public.sample_exam_groups;
create policy "sample_exam_groups_insert_own"
  on public.sample_exam_groups for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "sample_exam_groups_update_own" on public.sample_exam_groups;
create policy "sample_exam_groups_update_own"
  on public.sample_exam_groups for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "sample_exam_groups_delete_own" on public.sample_exam_groups;
create policy "sample_exam_groups_delete_own"
  on public.sample_exam_groups for delete
  using (auth.uid() = user_id);

drop policy if exists "sample_exam_group_items_select_own" on public.sample_exam_group_items;
create policy "sample_exam_group_items_select_own"
  on public.sample_exam_group_items for select
  using (auth.uid() = user_id);

drop policy if exists "sample_exam_group_items_insert_own" on public.sample_exam_group_items;
create policy "sample_exam_group_items_insert_own"
  on public.sample_exam_group_items for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "sample_exam_group_items_update_own" on public.sample_exam_group_items;
create policy "sample_exam_group_items_update_own"
  on public.sample_exam_group_items for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "sample_exam_group_items_delete_own" on public.sample_exam_group_items;
create policy "sample_exam_group_items_delete_own"
  on public.sample_exam_group_items for delete
  using (auth.uid() = user_id);
