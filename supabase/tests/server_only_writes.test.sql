-- Run with `supabase test db` after applying all migrations to a local database.
begin;
create extension if not exists pgtap with schema extensions;
select plan(10);

select ok(not has_table_privilege('authenticated', 'public.games', 'INSERT'),
    'authenticated users cannot insert games directly');
select ok(not has_table_privilege('authenticated', 'public.games', 'UPDATE'),
    'authenticated users cannot forge game results');
select ok(not has_table_privilege('authenticated', 'public.games', 'DELETE'),
    'authenticated users cannot delete games directly');
select ok(not has_table_privilege('anon', 'public.games', 'INSERT,UPDATE,DELETE'),
    'anonymous callers have no game write privileges');
select ok(not has_table_privilege('authenticated', 'public.space_explanations', 'INSERT,UPDATE,DELETE'),
    'authenticated users cannot poison the explanation cache');
select ok(not has_table_privilege('anon', 'public.space_explanations', 'INSERT,UPDATE,DELETE'),
    'anonymous users cannot poison the explanation cache');
select ok((select bool_and(has_table_privilege('service_role', 'public.games', privilege))
    from unnest(array['INSERT', 'UPDATE', 'DELETE']) as privilege),
    'server retains game write privileges');
select ok(has_table_privilege('service_role', 'public.space_explanations', 'INSERT'),
    'server retains cache insert privilege');
select is((select count(*)::integer from pg_policies
    where schemaname = 'public' and tablename in ('games', 'space_explanations')
    and cmd <> 'SELECT'), 0, 'no browser write policies remain');
select is((select count(*)::integer from pg_class
    where oid in ('public.games'::regclass, 'public.space_explanations'::regclass)
    and relrowsecurity), 2, 'RLS remains enabled on both tables');

select * from finish();
rollback;
