-- Create seasons table for league/championship tracking
CREATE TABLE public.seasons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  points_for_win INTEGER NOT NULL DEFAULT 10,
  points_for_second INTEGER NOT NULL DEFAULT 7,
  points_for_third INTEGER NOT NULL DEFAULT 5,
  points_for_fourth INTEGER NOT NULL DEFAULT 3,
  points_per_participation INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create season standings to track player points
CREATE TABLE public.season_standings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  season_id UUID NOT NULL REFERENCES public.seasons(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  total_points INTEGER NOT NULL DEFAULT 0,
  games_played INTEGER NOT NULL DEFAULT 0,
  wins INTEGER NOT NULL DEFAULT 0,
  second_places INTEGER NOT NULL DEFAULT 0,
  third_places INTEGER NOT NULL DEFAULT 0,
  total_winnings INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(season_id, user_id)
);

-- Enable RLS
ALTER TABLE public.seasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.season_standings ENABLE ROW LEVEL SECURITY;

-- Seasons policies
CREATE POLICY "Club members can view seasons"
ON public.seasons
FOR SELECT
USING (is_club_member(auth.uid(), club_id));

CREATE POLICY "Club admins can create seasons"
ON public.seasons
FOR INSERT
WITH CHECK (is_club_admin_or_owner(auth.uid(), club_id));

CREATE POLICY "Club admins can update seasons"
ON public.seasons
FOR UPDATE
USING (is_club_admin_or_owner(auth.uid(), club_id));

CREATE POLICY "Club admins can delete seasons"
ON public.seasons
FOR DELETE
USING (is_club_admin_or_owner(auth.uid(), club_id));

-- Season standings policies (check via season -> club)
CREATE POLICY "Club members can view standings"
ON public.season_standings
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.seasons s
  WHERE s.id = season_standings.season_id
  AND is_club_member(auth.uid(), s.club_id)
));

CREATE POLICY "Club admins can manage standings"
ON public.season_standings
FOR ALL
USING (EXISTS (
  SELECT 1 FROM public.seasons s
  WHERE s.id = season_standings.season_id
  AND is_club_admin_or_owner(auth.uid(), s.club_id)
));

-- Add triggers for updated_at
CREATE TRIGGER update_seasons_updated_at
BEFORE UPDATE ON public.seasons
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_season_standings_updated_at
BEFORE UPDATE ON public.season_standings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();