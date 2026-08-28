alter table public.attempts
  add column if not exists attempt_mode text not null default 'exam';

alter table public.attempts
  drop constraint if exists attempts_attempt_mode_check;

alter table public.attempts
  add constraint attempts_attempt_mode_check
  check (attempt_mode in ('exam', 'practice'));
