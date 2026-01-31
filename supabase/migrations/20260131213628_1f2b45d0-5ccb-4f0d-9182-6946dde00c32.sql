-- Add new push notification preferences for game events
ALTER TABLE user_preferences 
ADD COLUMN IF NOT EXISTS push_game_started boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS push_player_eliminated boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS push_rebuy_addon boolean DEFAULT true;

-- Create game activity log table
CREATE TABLE game_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_session_id uuid NOT NULL REFERENCES game_sessions(id) ON DELETE CASCADE,
  activity_type text NOT NULL,
  player_id uuid REFERENCES game_players(id) ON DELETE SET NULL,
  player_name text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX idx_game_activity_log_session ON game_activity_log(game_session_id);
CREATE INDEX idx_game_activity_log_created ON game_activity_log(created_at DESC);

-- Enable realtime for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE game_activity_log;

-- Enable RLS
ALTER TABLE game_activity_log ENABLE ROW LEVEL SECURITY;

-- Club members can view game activity
CREATE POLICY "Club members can view game activity" ON game_activity_log
  FOR SELECT USING (is_game_session_club_member(auth.uid(), game_session_id));

-- Club admins can insert activity logs
CREATE POLICY "Club admins can insert game activity" ON game_activity_log
  FOR INSERT WITH CHECK (is_game_session_club_admin(auth.uid(), game_session_id));