drop policy if exists "attempts_insert_own" on public.attempts;
create policy "attempts_insert_own"
  on public.attempts for insert
  to authenticated
  with check (auth.uid() = user_id);
