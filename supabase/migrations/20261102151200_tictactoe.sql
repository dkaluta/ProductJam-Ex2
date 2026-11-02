-- 1. Create custom enums safely
do $$ begin
		create type game_outcome as enum ('game_won', 'draw', 'in_progress');
exception
		when duplicate_object then null;
end $$;

do $$ begin
		create type player_mark as enum ('X', 'O');
exception
		when duplicate_object then null;
end $$;

-- 2. Create the table
create table if not exists public.tictactoe (
		-- Board ID
		id uuid primary key default gen_random_uuid(),
		
		-- Board owner's user ID (defaults to the currently authenticated user in Supabase)
		owner_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
		
		-- A representation of the 4x4 board as a fixed-length string of 16 characters
		board char(16) not null default '________________',
		
		-- Game lifecycle state
		outcome game_outcome not null default 'in_progress',
		
		-- Next player to move (null once the match finishes)
		turn player_mark null default 'X',
		
		-- Mark of the winning player (null if in_progress or draw)
		winner player_mark null,
		
		-- The 4 coordinates that formed the winning line (null if in_progress or draw)
		winning_line smallint[] null,
		
		-- Ordered sequence of moves played (e.g., [0, 5, 10, ...])
		moves smallint[] not null default '{}',
		
		-- Generated total move count
		move_count smallint generated always as (cardinality(moves)) stored,
		
		-- Timestamps
		created_at timestamptz not null default now(),
		updated_at timestamptz not null default now(),
		completed_at timestamptz null,
		
		-- Consistency constraints
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

drop trigger if exists set_tictactoe_updated_at on public.tictactoe;
create trigger set_tictactoe_updated_at
		before update on public.tictactoe
		for each row
		execute function public.handle_updated_at();

-- 4. Enable Row Level Security (RLS)
alter table public.tictactoe enable row level security;

-- Policies: Users have full CRUD access to their own boards
create policy "Users can view their own games"
		on public.tictactoe
		for select
		using (auth.uid() = owner_id);

create policy "Users can create their own games"
		on public.tictactoe
		for insert
		with check (auth.uid() = owner_id);

create policy "Users can update their own games"
		on public.tictactoe
		for update
		using (auth.uid() = owner_id)
		with check (auth.uid() = owner_id);

create policy "Users can delete their own games"
		on public.tictactoe
		for delete
		using (auth.uid() = owner_id);

-- 5. Helpful indexes
create index if not exists idx_tictactoe_owner_outcome 
		on public.tictactoe (owner_id, outcome);

create index if not exists idx_tictactoe_owner_created 
		on public.tictactoe (owner_id, created_at desc);
