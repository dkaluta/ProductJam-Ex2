-- Forward migration: also closes policies on databases already initialized.
begin;

drop policy if exists "Users can create their own games" on public.games;
drop policy if exists "Users can update their own games" on public.games;
drop policy if exists "Users can delete their own games" on public.games;
drop policy if exists "Authenticated users can insert space explanations"
    on public.space_explanations;

-- Keep SELECT policies, but make browser writes unavailable at the privilege
-- layer too. The server's service_role retains its write privileges and bypasses RLS.
revoke insert, update, delete, truncate, references, trigger
    on public.games, public.space_explanations from anon, authenticated;

commit;
