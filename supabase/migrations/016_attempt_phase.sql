alter table public.attempts
  add column if not exists current_phase text not null default 'part1';

alter table public.attempts
  add column if not exists part2_started_at timestamptz;

update public.attempts
set current_phase = 'part2'
where section_mode = 'part2';

update public.attempts
set current_phase = 'part2',
    part2_started_at = started_at
where section_mode = 'full'
  and submitted_at is null;

alter table public.attempts
  drop constraint if exists attempts_current_phase_check;

alter table public.attempts
  add constraint attempts_current_phase_check
  check (current_phase in ('part1', 'part2'));
