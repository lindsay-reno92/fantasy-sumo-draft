-- Migration: Add Hater Pick Feature
-- Run this in your Supabase SQL Editor

-- Create hater picks table
CREATE TABLE IF NOT EXISTS hater_picks (
  id bigserial PRIMARY KEY,
  user_id bigint REFERENCES users(id) ON DELETE CASCADE,
  rikishi_id integer REFERENCES rikishi(id) ON DELETE CASCADE,
  hater_cost integer NOT NULL CHECK (hater_cost > 0),
  selected_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id) -- Each user can only have one hater pick
);

-- Enable Row Level Security for hater picks
ALTER TABLE hater_picks ENABLE ROW LEVEL SECURITY;

-- Add policies for hater picks (only create if they don't exist)
DO $$
BEGIN
  -- Policy for viewing hater picks
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'hater_picks' 
    AND policyname = 'Users can view all hater picks'
  ) THEN
    CREATE POLICY "Users can view all hater picks" 
    ON hater_picks FOR SELECT 
    TO anon, authenticated 
    USING (true);
  END IF;

  -- Policy for managing own hater picks
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'hater_picks' 
    AND policyname = 'Users can manage their own hater picks'
  ) THEN
    CREATE POLICY "Users can manage their own hater picks" 
    ON hater_picks FOR ALL 
    TO anon, authenticated 
    USING (auth.uid()::text = user_id::text)
    WITH CHECK (auth.uid()::text = user_id::text);
  END IF;
END
$$; 