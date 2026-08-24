alter table public.contributions drop constraint if exists contributions_kind_check;
alter table public.contributions
  add constraint contributions_kind_check
  check (kind in ('essay', 'questions', 'sample'));
