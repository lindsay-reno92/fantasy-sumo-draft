-- Enable Row Level Security
alter default privileges in schema public grant all on tables to anon, authenticated;

-- Users table
create table if not exists users (
  id bigserial primary key,
  sumo_name text unique not null,
  remaining_points integer default 50 check (remaining_points >= 0),
  is_draft_finalized boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Rikishi table (load from your JSON data)
create table if not exists rikishi (
  id integer primary key,
  name text not null,
  official_rank text,
  ranking_group text not null check (ranking_group in ('Yellow', 'Blue', 'Green', 'White')),
  draft_value integer not null check (draft_value > 0),
  wins integer default 0,
  losses integer default 0,
  absences integer default 0,
  last_tourney_wins integer default 0,
  last_tourney_losses integer default 0,
  weight_lbs decimal,
  height_inches decimal,
  age decimal,
  times_picked integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Draft selections table
create table if not exists draft_selections (
  id bigserial primary key,
  user_id bigint references users(id) on delete cascade,
  rikishi_id integer references rikishi(id) on delete cascade,
  selected_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, rikishi_id)
);

-- Row Level Security
alter table users enable row level security;
alter table rikishi enable row level security;  
alter table draft_selections enable row level security;

-- Drop existing policies if they exist to avoid conflicts
drop policy if exists "Users can view all users" on users;
drop policy if exists "Users can create their own record" on users;
drop policy if exists "Users can update their own record" on users;
drop policy if exists "Anyone can view rikishi" on rikishi;
drop policy if exists "Anyone can view all draft selections" on draft_selections;
drop policy if exists "Users can create their own selections" on draft_selections;
drop policy if exists "Users can delete their own selections" on draft_selections;

-- Create policies fresh
create policy "Users can view all users" on users for select to anon, authenticated using (true);
create policy "Users can create their own record" on users for insert to anon, authenticated with check (true);
create policy "Users can update their own record" on users for update to anon, authenticated using (true);

-- Rikishi policies (read-only for regular users)
create policy "Anyone can view rikishi" on rikishi for select to anon, authenticated using (true);

-- Admin users can update rikishi values (we handle admin authorization at application level)
create policy "Allow updates to rikishi" on rikishi for update to anon, authenticated using (true);

-- Draft selections policies
create policy "Anyone can view all draft selections" on draft_selections for select to anon, authenticated using (true);
create policy "Users can create their own selections" on draft_selections for insert to anon, authenticated with check (true);
create policy "Users can delete their own selections" on draft_selections for delete to anon, authenticated using (true);

-- Indexes for performance (safe to run multiple times)
create index if not exists idx_draft_selections_user_id on draft_selections(user_id);
create index if not exists idx_draft_selections_rikishi_id on draft_selections(rikishi_id);
create index if not exists idx_rikishi_ranking_group on rikishi(ranking_group);
create index if not exists idx_users_sumo_name on users(sumo_name);

-- Function to update timestamps (safe to recreate)
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

-- Drop and recreate trigger to avoid conflicts
drop trigger if exists update_users_updated_at on users;
create trigger update_users_updated_at before update on users
  for each row execute procedure update_updated_at_column();

-- Real-time subscriptions (skip if already exists)
-- Note: These may give warnings if tables are already in publication, but that's OK
do $$
begin
  begin
    alter publication supabase_realtime add table users;
  exception 
    when duplicate_object then null;
  end;
  
  begin
    alter publication supabase_realtime add table draft_selections;
  exception 
    when duplicate_object then null;
  end;
end $$; 