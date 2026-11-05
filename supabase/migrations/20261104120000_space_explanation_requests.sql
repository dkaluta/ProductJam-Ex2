-- Durable at-most-once generation claims. No TTL: an interrupted provider call
-- may have been billed. Only an operator can decide whether it is safe to retry.
create table public.space_explanation_requests (
    date text primary key,
    result jsonb,
    error_code text check (error_code in ('gemini_unavailable', 'invalid_ai_output')),
    created_at timestamptz not null default now(),
    constraint request_date_format check (date ~ '^\d{4}-\d{2}-\d{2}$')
);
alter table public.space_explanation_requests enable row level security;
revoke all on public.space_explanation_requests from anon, authenticated;
grant select, insert, update on public.space_explanation_requests to service_role;
