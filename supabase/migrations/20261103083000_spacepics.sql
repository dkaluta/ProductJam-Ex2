create table if not exists public.space_explanations (
    -- The APOD date acts as the natural unique primary key (e.g. '2024-03-15')
    date text primary key,
    
    -- NASA original metadata (useful for display or fallback)
    nasa_title text not null,
    nasa_explanation text not null,
    image_url text not null,
    media_type text not null default 'image',
    
    -- Gemini-generated Hebrew fields
    hebrew_title text not null,
    hebrew_summary text not null,
    
    -- List of 1-5 chosen tags (e.g. ['galaxy', 'nebula'])
    tags text[] not null,
    
    -- Who originally triggered the translation (optional but good for auditing)
    created_by uuid references auth.users(id) on delete set null,
    created_at timestamptz not null default now(),

    -- Consistency constraints
    constraint check_tags_count check (cardinality(tags) between 1 and 5)
);

-- RLS: Logged-in users can read all cached explanations. Writes are server-only.
alter table public.space_explanations enable row level security;

create policy "Authenticated users can read cached space explanations"
    on public.space_explanations
    for select
    to authenticated
    using (true);

-- Only the server may populate the cache after validating provider output.
