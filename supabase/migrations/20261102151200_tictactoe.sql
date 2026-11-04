-- 1. Create custom enums safely
do $$ begin
		create type game_outcome as enum ('in_progress', 'game_won', 'draw');
exception
		when duplicate_object then null;
end $$;

do $$ begin
		create type player_mark as enum ('X', 'O');
exception
		when duplicate_object then null;
end $$;

-- 2. Create the table
create table if not exists public.games (
		-- Primary key
		id uuid primary key default gen_random_uuid(),
		
		-- Owner reference (defaults to authenticated caller in Supabase)
		owner_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
		
		-- Board representation as a fixed-length string of 16 characters
		board char(16) not null default '________________',
		
		-- Game lifecycle outcome
		outcome game_outcome not null default 'in_progress',
		
		-- Next player to move; null once match finishes
		turn player_mark null default 'X',
		
		-- Winner mark; null if in_progress or draw
		winner player_mark null,
		
		-- 4 winning indices; null if in_progress or draw
		winning_line smallint[] null,
		
		-- Ordered sequence of played positions
		moves smallint[] not null default '{}',
		
		-- Generated total move count
		move_count smallint generated always as (cardinality(moves)) stored,
		
		-- Timestamps
		created_at timestamptz not null default now(),
		updated_at timestamptz not null default now(),
		completed_at timestamptz null,
		
		-- Constraints matching design spec
		constraint check_board_length check (char_length(board) = 16),
		
		constraint check_winner_and_status check (
				(outcome = 'in_progress' and winner is null and winning_line is null and turn is not null and completed_at is null) or
				(outcome = 'game_won' and winner is not null and cardinality(winning_line) = 4 and turn is null and completed_at is not null) or
				(outcome = 'draw' and winner is null and winning_line is null and turn is null and completed_at is not null)
		)
);

-- 3. Automatic updated_at timestamp trigger
create or replace function public.handle_updated_at()
returns trigger as $$
begin
		new.updated_at = now();
		return new;
end;
$$ language plpgsql;

drop trigger if exists set_games_updated_at on public.games;
create trigger set_games_updated_at
		before update on public.games
		for each row
		execute function public.handle_updated_at();

-- 4. Enable Row Level Security (RLS)
alter table public.games enable row level security;

-- Browsers may only read their own games; the service-role API handles writes.
create policy "Users can view their own games"
		on public.games
		for select
		using (auth.uid() = owner_id);

-- No browser write policies: only the validated server API may mutate games.

-- 5. Indexes for fast listing and filtering
create index if not exists idx_games_owner_outcome 
		on public.games (owner_id, outcome);

create index if not exists idx_games_owner_created 
		on public.games (owner_id, created_at desc);