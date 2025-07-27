-- Extended Fantasy Sumo League Schema for Live Tournament Integration
-- This extends the existing draft system with live tournament data

-- Add API mapping to existing rikishi table
ALTER TABLE rikishi ADD COLUMN IF NOT EXISTS sumo_api_id INTEGER UNIQUE;
ALTER TABLE rikishi ADD COLUMN IF NOT EXISTS current_rank TEXT;
ALTER TABLE rikishi ADD COLUMN IF NOT EXISTS heya TEXT;
ALTER TABLE rikishi ADD COLUMN IF NOT EXISTS shusshin TEXT;
ALTER TABLE rikishi ADD COLUMN IF NOT EXISTS birth_date DATE;
ALTER TABLE rikishi ADD COLUMN IF NOT EXISTS debut TEXT;
ALTER TABLE rikishi ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Tournaments (Basho) table
CREATE TABLE IF NOT EXISTS basho (
  id TEXT PRIMARY KEY, -- e.g., "202507" 
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  location TEXT,
  is_active BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Individual matches within tournaments
CREATE TABLE IF NOT EXISTS matches (
  id BIGSERIAL PRIMARY KEY,
  basho_id TEXT REFERENCES basho(id),
  division TEXT NOT NULL, -- Makuuchi, Juryo, etc.
  day INTEGER NOT NULL, -- Tournament day (1-15)
  match_no INTEGER NOT NULL,
  east_rikishi_id INTEGER REFERENCES rikishi(id),
  west_rikishi_id INTEGER REFERENCES rikishi(id),
  winner_rikishi_id INTEGER REFERENCES rikishi(id),
  kimarite TEXT, -- Winning technique
  match_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(basho_id, division, day, match_no)
);

-- Live tournament performance tracking
CREATE TABLE IF NOT EXISTS tournament_performance (
  id BIGSERIAL PRIMARY KEY,
  basho_id TEXT REFERENCES basho(id),
  rikishi_id INTEGER REFERENCES rikishi(id),
  wins INTEGER DEFAULT 0,
  losses INTEGER DEFAULT 0,
  absences INTEGER DEFAULT 0,
  current_streak INTEGER DEFAULT 0, -- Win/loss streak
  division TEXT NOT NULL,
  rank_at_start TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(basho_id, rikishi_id)
);

-- Fantasy league standings - tracks user performance per tournament
CREATE TABLE IF NOT EXISTS league_standings (
  id BIGSERIAL PRIMARY KEY,
  basho_id TEXT REFERENCES basho(id),
  user_id BIGINT REFERENCES users(id),
  total_wins INTEGER DEFAULT 0,
  total_losses INTEGER DEFAULT 0,
  bonus_points INTEGER DEFAULT 0, -- For special achievements
  total_fantasy_points DECIMAL DEFAULT 0,
  rank_position INTEGER,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(basho_id, user_id)
);

-- Fantasy scoring rules configuration
CREATE TABLE IF NOT EXISTS scoring_rules (
  id BIGSERIAL PRIMARY KEY,
  rule_type TEXT NOT NULL, -- 'win', 'special_technique', 'upset_victory', etc.
  condition_data JSONB, -- Flexible conditions (e.g., {"rank_difference": 5})
  points_awarded INTEGER NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Track individual scoring events for transparency
CREATE TABLE IF NOT EXISTS scoring_events (
  id BIGSERIAL PRIMARY KEY,
  basho_id TEXT REFERENCES basho(id),
  user_id BIGINT REFERENCES users(id),
  rikishi_id INTEGER REFERENCES rikishi(id),
  match_id BIGINT REFERENCES matches(id),
  rule_id BIGINT REFERENCES scoring_rules(id),
  points_earned INTEGER NOT NULL,
  event_description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_matches_basho_day ON matches(basho_id, day);
CREATE INDEX IF NOT EXISTS idx_tournament_performance_basho ON tournament_performance(basho_id);
CREATE INDEX IF NOT EXISTS idx_league_standings_basho ON league_standings(basho_id);
CREATE INDEX IF NOT EXISTS idx_scoring_events_user_basho ON scoring_events(user_id, basho_id);

-- RLS Policies for new tables
ALTER TABLE basho ENABLE ROW LEVEL security;
ALTER TABLE matches ENABLE ROW LEVEL security;
ALTER TABLE tournament_performance ENABLE ROW LEVEL security;
ALTER TABLE league_standings ENABLE ROW LEVEL security;
ALTER TABLE scoring_rules ENABLE ROW LEVEL security;
ALTER TABLE scoring_events ENABLE ROW LEVEL security;

-- Public read access for tournament data
CREATE POLICY "Public read access to basho" ON basho FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public read access to matches" ON matches FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public read access to tournament_performance" ON tournament_performance FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public read access to league_standings" ON league_standings FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public read access to scoring_rules" ON scoring_rules FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Users can view their scoring events" ON scoring_events FOR SELECT TO anon, authenticated USING (true);

-- Insert default scoring rules
INSERT INTO scoring_rules (rule_type, condition_data, points_awarded, description) VALUES
('regular_win', '{}', 1, 'Standard win - 1 point'),
('upset_victory', '{"min_rank_difference": 3}', 2, 'Upset victory - defeating higher ranked opponent (+2 points)'),
('special_technique', '{"rare_kimarite": true}', 1, 'Bonus for rare winning technique (+1 point)'),
('perfect_tournament', '{"wins": 15, "losses": 0}', 10, 'Perfect tournament bonus (+10 points)'),
('kachikoshi', '{"wins": 8, "tournament_complete": true}', 3, 'Winning record bonus (+3 points)')
ON CONFLICT DO NOTHING;

-- Real-time subscriptions
ALTER PUBLICATION supabase_realtime ADD TABLE matches;
ALTER PUBLICATION supabase_realtime ADD TABLE tournament_performance;
ALTER PUBLICATION supabase_realtime ADD TABLE league_standings;
ALTER PUBLICATION supabase_realtime ADD TABLE scoring_events; 