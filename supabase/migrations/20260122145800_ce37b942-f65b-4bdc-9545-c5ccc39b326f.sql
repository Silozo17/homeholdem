-- Create game_sessions table for tournament tracking
CREATE TABLE public.game_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'paused', 'completed')),
  current_level INTEGER NOT NULL DEFAULT 1,
  level_started_at TIMESTAMP WITH TIME ZONE,
  time_remaining_seconds INTEGER,
  buy_in_amount INTEGER NOT NULL DEFAULT 20,
  rebuy_amount INTEGER NOT NULL DEFAULT 20,
  addon_amount INTEGER NOT NULL DEFAULT 20,
  starting_chips INTEGER NOT NULL DEFAULT 10000,
  rebuy_chips INTEGER NOT NULL DEFAULT 10000,
  addon_chips INTEGER NOT NULL DEFAULT 10000,
  allow_rebuys BOOLEAN NOT NULL DEFAULT true,
  allow_addons BOOLEAN NOT NULL DEFAULT true,
  rebuy_until_level INTEGER DEFAULT 4,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create blind_structures table for customizable blind levels
CREATE TABLE public.blind_structures (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  game_session_id UUID NOT NULL REFERENCES public.game_sessions(id) ON DELETE CASCADE,
  level INTEGER NOT NULL,
  small_blind INTEGER NOT NULL,
  big_blind INTEGER NOT NULL,
  ante INTEGER NOT NULL DEFAULT 0,
  duration_minutes INTEGER NOT NULL DEFAULT 15,
  is_break BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create game_players table for tracking players in a session
CREATE TABLE public.game_players (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  game_session_id UUID NOT NULL REFERENCES public.game_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  display_name TEXT NOT NULL,
  table_number INTEGER DEFAULT 1,
  seat_number INTEGER,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'eliminated', 'away')),
  finish_position INTEGER,
  eliminated_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(game_session_id, user_id)
);

-- Create game_transactions table for buy-ins, rebuys, add-ons, payouts
CREATE TABLE public.game_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  game_session_id UUID NOT NULL REFERENCES public.game_sessions(id) ON DELETE CASCADE,
  game_player_id UUID NOT NULL REFERENCES public.game_players(id) ON DELETE CASCADE,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('buyin', 'rebuy', 'addon', 'payout')),
  amount INTEGER NOT NULL,
  chips INTEGER,
  notes TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create payout_structures table for preset and custom payouts
CREATE TABLE public.payout_structures (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  game_session_id UUID NOT NULL REFERENCES public.game_sessions(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  percentage DECIMAL(5,2) NOT NULL,
  amount INTEGER,
  player_id UUID REFERENCES public.game_players(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.game_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blind_structures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payout_structures ENABLE ROW LEVEL SECURITY;

-- Helper function to check if user is member of game session's event club
CREATE OR REPLACE FUNCTION public.is_game_session_club_member(_user_id UUID, _game_session_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.game_sessions gs
    JOIN public.events e ON e.id = gs.event_id
    JOIN public.club_members cm ON cm.club_id = e.club_id
    WHERE gs.id = _game_session_id AND cm.user_id = _user_id
  )
$$;

-- Helper function to check if user is admin of game session's event club
CREATE OR REPLACE FUNCTION public.is_game_session_club_admin(_user_id UUID, _game_session_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.game_sessions gs
    JOIN public.events e ON e.id = gs.event_id
    JOIN public.club_members cm ON cm.club_id = e.club_id
    WHERE gs.id = _game_session_id 
      AND cm.user_id = _user_id 
      AND cm.role IN ('owner', 'admin')
  )
$$;

-- RLS Policies for game_sessions
CREATE POLICY "Club members can view game sessions"
  ON public.game_sessions FOR SELECT
  USING (is_event_club_member(auth.uid(), event_id));

CREATE POLICY "Club admins can create game sessions"
  ON public.game_sessions FOR INSERT
  WITH CHECK (is_event_club_admin(auth.uid(), event_id));

CREATE POLICY "Club admins can update game sessions"
  ON public.game_sessions FOR UPDATE
  USING (is_event_club_admin(auth.uid(), event_id))
  WITH CHECK (is_event_club_admin(auth.uid(), event_id));

CREATE POLICY "Club admins can delete game sessions"
  ON public.game_sessions FOR DELETE
  USING (is_event_club_admin(auth.uid(), event_id));

-- RLS Policies for blind_structures
CREATE POLICY "Club members can view blind structures"
  ON public.blind_structures FOR SELECT
  USING (is_game_session_club_member(auth.uid(), game_session_id));

CREATE POLICY "Club admins can manage blind structures"
  ON public.blind_structures FOR INSERT
  WITH CHECK (is_game_session_club_admin(auth.uid(), game_session_id));

CREATE POLICY "Club admins can update blind structures"
  ON public.blind_structures FOR UPDATE
  USING (is_game_session_club_admin(auth.uid(), game_session_id));

CREATE POLICY "Club admins can delete blind structures"
  ON public.blind_structures FOR DELETE
  USING (is_game_session_club_admin(auth.uid(), game_session_id));

-- RLS Policies for game_players
CREATE POLICY "Club members can view game players"
  ON public.game_players FOR SELECT
  USING (is_game_session_club_member(auth.uid(), game_session_id));

CREATE POLICY "Club admins can manage game players"
  ON public.game_players FOR INSERT
  WITH CHECK (is_game_session_club_admin(auth.uid(), game_session_id));

CREATE POLICY "Club admins can update game players"
  ON public.game_players FOR UPDATE
  USING (is_game_session_club_admin(auth.uid(), game_session_id));

CREATE POLICY "Club admins can delete game players"
  ON public.game_players FOR DELETE
  USING (is_game_session_club_admin(auth.uid(), game_session_id));

-- RLS Policies for game_transactions
CREATE POLICY "Club members can view transactions"
  ON public.game_transactions FOR SELECT
  USING (is_game_session_club_member(auth.uid(), game_session_id));

CREATE POLICY "Club admins can create transactions"
  ON public.game_transactions FOR INSERT
  WITH CHECK (is_game_session_club_admin(auth.uid(), game_session_id));

CREATE POLICY "Club admins can update transactions"
  ON public.game_transactions FOR UPDATE
  USING (is_game_session_club_admin(auth.uid(), game_session_id));

CREATE POLICY "Club admins can delete transactions"
  ON public.game_transactions FOR DELETE
  USING (is_game_session_club_admin(auth.uid(), game_session_id));

-- RLS Policies for payout_structures
CREATE POLICY "Club members can view payouts"
  ON public.payout_structures FOR SELECT
  USING (is_game_session_club_member(auth.uid(), game_session_id));

CREATE POLICY "Club admins can manage payouts"
  ON public.payout_structures FOR INSERT
  WITH CHECK (is_game_session_club_admin(auth.uid(), game_session_id));

CREATE POLICY "Club admins can update payouts"
  ON public.payout_structures FOR UPDATE
  USING (is_game_session_club_admin(auth.uid(), game_session_id));

CREATE POLICY "Club admins can delete payouts"
  ON public.payout_structures FOR DELETE
  USING (is_game_session_club_admin(auth.uid(), game_session_id));

-- Enable realtime for game sessions (for timer sync)
ALTER PUBLICATION supabase_realtime ADD TABLE public.game_sessions;

-- Add updated_at trigger
CREATE TRIGGER update_game_sessions_updated_at
  BEFORE UPDATE ON public.game_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_game_players_updated_at
  BEFORE UPDATE ON public.game_players
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();