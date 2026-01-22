-- Add guest player support
ALTER TABLE game_players 
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS is_guest BOOLEAN DEFAULT false;

-- Add blinds display mode to game_sessions
ALTER TABLE game_sessions
ADD COLUMN IF NOT EXISTS display_blinds_as_currency BOOLEAN DEFAULT false;