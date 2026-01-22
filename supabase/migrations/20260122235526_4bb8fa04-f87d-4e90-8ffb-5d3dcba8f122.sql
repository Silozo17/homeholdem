-- Create placeholder_players table for unregistered historical players
CREATE TABLE public.placeholder_players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  display_name text NOT NULL,
  linked_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.placeholder_players ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Club admins can manage placeholder players"
ON public.placeholder_players
FOR ALL
USING (is_club_admin_or_owner(auth.uid(), club_id));

CREATE POLICY "Club members can view placeholder players"
ON public.placeholder_players
FOR SELECT
USING (is_club_member(auth.uid(), club_id));

-- Add placeholder_player_id to season_standings
ALTER TABLE public.season_standings
ADD COLUMN placeholder_player_id uuid REFERENCES public.placeholder_players(id) ON DELETE CASCADE;

-- Make user_id nullable (but require either user_id OR placeholder_player_id)
ALTER TABLE public.season_standings
ALTER COLUMN user_id DROP NOT NULL;

-- Add constraint: either user_id or placeholder_player_id must be set
ALTER TABLE public.season_standings
ADD CONSTRAINT standings_user_or_placeholder_check 
CHECK (
  (user_id IS NOT NULL AND placeholder_player_id IS NULL) OR
  (user_id IS NULL AND placeholder_player_id IS NOT NULL)
);

-- Update RLS policies for season_standings to handle placeholder players
DROP POLICY IF EXISTS "Club members can view standings" ON public.season_standings;
CREATE POLICY "Club members can view standings"
ON public.season_standings
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM seasons s 
    WHERE s.id = season_standings.season_id 
    AND is_club_member(auth.uid(), s.club_id)
  )
);