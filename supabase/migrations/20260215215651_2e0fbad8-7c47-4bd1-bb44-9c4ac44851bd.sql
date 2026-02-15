
-- ==================
-- ENUMS
-- ==================
CREATE TYPE public.poker_table_type AS ENUM ('friends', 'club', 'public');
CREATE TYPE public.poker_table_status AS ENUM ('waiting', 'playing', 'paused', 'closed');
CREATE TYPE public.poker_hand_phase AS ENUM ('preflop', 'flop', 'turn', 'river', 'showdown', 'complete');
CREATE TYPE public.poker_seat_status AS ENUM ('active', 'sitting_out', 'disconnected');
CREATE TYPE public.poker_action_type AS ENUM ('fold', 'check', 'call', 'raise', 'all_in', 'post_blind', 'post_ante');
CREATE TYPE public.poker_tournament_status AS ENUM ('registering', 'running', 'paused', 'completed', 'cancelled');

-- ==================
-- TOURNAMENTS (created first because poker_tables references it)
-- ==================
CREATE TABLE public.poker_tournaments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID NOT NULL DEFAULT auth.uid(),
  club_id UUID REFERENCES public.clubs(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  tournament_type TEXT NOT NULL DEFAULT 'sit_and_go',
  status public.poker_tournament_status NOT NULL DEFAULT 'registering',
  max_players INTEGER NOT NULL DEFAULT 18,
  starting_stack INTEGER NOT NULL DEFAULT 5000,
  blind_schedule JSONB NOT NULL DEFAULT '[]',
  current_level INTEGER NOT NULL DEFAULT 0,
  level_started_at TIMESTAMPTZ,
  late_reg_levels INTEGER NOT NULL DEFAULT 3,
  players_per_table INTEGER NOT NULL DEFAULT 9,
  payout_structure JSONB DEFAULT '[]',
  invite_code TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_poker_tournaments_status ON public.poker_tournaments (status)
  WHERE status IN ('registering', 'running');

-- ==================
-- TABLES
-- ==================
CREATE TABLE public.poker_tables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID NOT NULL DEFAULT auth.uid(),
  club_id UUID REFERENCES public.clubs(id) ON DELETE SET NULL,
  table_type public.poker_table_type NOT NULL DEFAULT 'friends',
  name TEXT NOT NULL,
  max_seats INTEGER NOT NULL DEFAULT 9 CHECK (max_seats BETWEEN 2 AND 10),
  small_blind INTEGER NOT NULL DEFAULT 50,
  big_blind INTEGER NOT NULL DEFAULT 100,
  ante INTEGER NOT NULL DEFAULT 0,
  min_buy_in INTEGER NOT NULL DEFAULT 1000,
  max_buy_in INTEGER NOT NULL DEFAULT 10000,
  invite_code TEXT,
  status public.poker_table_status NOT NULL DEFAULT 'waiting',
  tournament_id UUID REFERENCES public.poker_tournaments(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_poker_tables_status ON public.poker_tables (status) WHERE status IN ('waiting', 'playing');
CREATE INDEX idx_poker_tables_club ON public.poker_tables (club_id) WHERE club_id IS NOT NULL;

-- ==================
-- SEATS
-- ==================
CREATE TABLE public.poker_seats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_id UUID NOT NULL REFERENCES public.poker_tables(id) ON DELETE CASCADE,
  seat_number INTEGER NOT NULL CHECK (seat_number BETWEEN 0 AND 9),
  player_id UUID,
  stack INTEGER NOT NULL DEFAULT 0,
  status public.poker_seat_status NOT NULL DEFAULT 'active',
  consecutive_timeouts INTEGER NOT NULL DEFAULT 0,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_action_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (table_id, seat_number),
  UNIQUE (table_id, player_id)
);

CREATE INDEX idx_poker_seats_table ON public.poker_seats (table_id);
CREATE INDEX idx_poker_seats_player ON public.poker_seats (player_id) WHERE player_id IS NOT NULL;

-- ==================
-- HANDS
-- ==================
CREATE TABLE public.poker_hands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_id UUID NOT NULL REFERENCES public.poker_tables(id) ON DELETE CASCADE,
  hand_number INTEGER NOT NULL,
  dealer_seat INTEGER NOT NULL,
  sb_seat INTEGER NOT NULL,
  bb_seat INTEGER NOT NULL,
  phase public.poker_hand_phase NOT NULL DEFAULT 'preflop',
  community_cards JSONB NOT NULL DEFAULT '[]',
  pots JSONB NOT NULL DEFAULT '[]',
  current_actor_seat INTEGER,
  current_bet INTEGER NOT NULL DEFAULT 0,
  min_raise INTEGER NOT NULL DEFAULT 0,
  action_deadline TIMESTAMPTZ,
  deck_seed_commitment TEXT,
  deck_seed_internal TEXT,
  deck_seed_revealed TEXT,
  state_version INTEGER NOT NULL DEFAULT 0,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  results JSONB
);

CREATE INDEX idx_poker_hands_table ON public.poker_hands (table_id, hand_number DESC);

-- ==================
-- HOLE CARDS (strict RLS)
-- ==================
CREATE TABLE public.poker_hole_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hand_id UUID NOT NULL REFERENCES public.poker_hands(id) ON DELETE CASCADE,
  player_id UUID NOT NULL,
  seat_number INTEGER NOT NULL,
  cards JSONB NOT NULL,
  UNIQUE (hand_id, player_id)
);

CREATE INDEX idx_poker_hole_cards_hand ON public.poker_hole_cards (hand_id);

-- ==================
-- ACTIONS (append-only log)
-- ==================
CREATE TABLE public.poker_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hand_id UUID NOT NULL REFERENCES public.poker_hands(id) ON DELETE CASCADE,
  player_id UUID NOT NULL,
  seat_number INTEGER NOT NULL,
  action_type public.poker_action_type NOT NULL,
  amount INTEGER DEFAULT 0,
  phase public.poker_hand_phase NOT NULL,
  sequence INTEGER NOT NULL,
  server_timestamp TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_poker_actions_hand ON public.poker_actions (hand_id, sequence);

-- ==================
-- TOURNAMENT PLAYERS
-- ==================
CREATE TABLE public.poker_tournament_players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES public.poker_tournaments(id) ON DELETE CASCADE,
  player_id UUID NOT NULL,
  table_id UUID REFERENCES public.poker_tables(id) ON DELETE SET NULL,
  seat_number INTEGER,
  stack INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'registered',
  finish_position INTEGER,
  payout_amount INTEGER DEFAULT 0,
  registered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  eliminated_at TIMESTAMPTZ,
  UNIQUE (tournament_id, player_id)
);

CREATE INDEX idx_tournament_players_tournament ON public.poker_tournament_players (tournament_id);
CREATE INDEX idx_tournament_players_player ON public.poker_tournament_players (player_id);

-- ==================
-- PUBLIC VIEW (hides deck_seed_internal)
-- ==================
CREATE VIEW public.poker_hands_public AS
SELECT id, table_id, hand_number, dealer_seat, sb_seat, bb_seat,
       phase, community_cards, pots, current_actor_seat,
       current_bet, min_raise, action_deadline,
       deck_seed_commitment,
       CASE WHEN completed_at IS NOT NULL THEN deck_seed_revealed ELSE NULL END as deck_seed_revealed,
       started_at, completed_at, results, state_version
FROM public.poker_hands;

-- ==================
-- RLS: poker_tables
-- ==================
ALTER TABLE public.poker_tables ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View public and own tables" ON public.poker_tables
  FOR SELECT TO authenticated
  USING (
    table_type = 'public'
    OR created_by = auth.uid()
    OR (club_id IS NOT NULL AND is_club_member(auth.uid(), club_id))
    OR EXISTS (SELECT 1 FROM public.poker_seats WHERE table_id = poker_tables.id AND player_id = auth.uid())
  );

CREATE POLICY "Create tables" ON public.poker_tables
  FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

-- ==================
-- RLS: poker_seats
-- ==================
ALTER TABLE public.poker_seats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View seats at accessible tables" ON public.poker_seats
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.poker_tables t
      WHERE t.id = table_id
      AND (t.table_type = 'public'
        OR t.created_by = auth.uid()
        OR (t.club_id IS NOT NULL AND is_club_member(auth.uid(), t.club_id))
        OR EXISTS (SELECT 1 FROM public.poker_seats ps WHERE ps.table_id = t.id AND ps.player_id = auth.uid()))
    )
  );

-- ==================
-- RLS: poker_hole_cards (CRITICAL — players see only own)
-- ==================
ALTER TABLE public.poker_hole_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Players see only own hole cards" ON public.poker_hole_cards
  FOR SELECT TO authenticated
  USING (player_id = auth.uid());

-- ==================
-- RLS: poker_actions
-- ==================
ALTER TABLE public.poker_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View actions at own table" ON public.poker_actions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.poker_hands h
      JOIN public.poker_tables t ON t.id = h.table_id
      WHERE h.id = hand_id
      AND (t.created_by = auth.uid()
        OR EXISTS (SELECT 1 FROM public.poker_seats ps WHERE ps.table_id = t.id AND ps.player_id = auth.uid()))
    )
  );

-- ==================
-- RLS: poker_hands
-- ==================
ALTER TABLE public.poker_hands ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View hands at own table" ON public.poker_hands
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.poker_tables t
      WHERE t.id = table_id
      AND (t.created_by = auth.uid()
        OR EXISTS (SELECT 1 FROM public.poker_seats ps WHERE ps.table_id = t.id AND ps.player_id = auth.uid()))
    )
  );

-- ==================
-- RLS: poker_tournaments
-- ==================
ALTER TABLE public.poker_tournaments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View tournaments" ON public.poker_tournaments
  FOR SELECT TO authenticated
  USING (
    (tournament_type = 'sit_and_go' AND status = 'registering')
    OR created_by = auth.uid()
    OR (club_id IS NOT NULL AND is_club_member(auth.uid(), club_id))
    OR EXISTS (SELECT 1 FROM public.poker_tournament_players WHERE tournament_id = poker_tournaments.id AND player_id = auth.uid())
  );

CREATE POLICY "Create tournaments" ON public.poker_tournaments
  FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

-- ==================
-- RLS: poker_tournament_players
-- ==================
ALTER TABLE public.poker_tournament_players ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View tournament players" ON public.poker_tournament_players
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.poker_tournaments t
      WHERE t.id = tournament_id
      AND (t.created_by = auth.uid()
        OR EXISTS (SELECT 1 FROM public.poker_tournament_players tp WHERE tp.tournament_id = t.id AND tp.player_id = auth.uid()))
    )
  );

-- ==================
-- RPC: read_poker_hand_state (no hole cards)
-- ==================
CREATE OR REPLACE FUNCTION public.read_poker_hand_state(
  _table_id UUID,
  _hand_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _hand poker_hands%ROWTYPE;
  _seats JSONB;
BEGIN
  SELECT * INTO _hand
  FROM poker_hands
  WHERE id = _hand_id
    AND table_id = _table_id
    AND completed_at IS NULL;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'hand_not_found');
  END IF;

  SELECT jsonb_agg(row_to_json(s)) INTO _seats
  FROM poker_seats s WHERE s.table_id = _table_id;

  RETURN jsonb_build_object(
    'hand', row_to_json(_hand),
    'seats', _seats
  );
END;
$$;

-- ==================
-- RPC: read_showdown_cards (showdown only)
-- ==================
CREATE OR REPLACE FUNCTION public.read_showdown_cards(
  _hand_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN (
    SELECT jsonb_agg(jsonb_build_object(
      'player_id', hc.player_id,
      'seat_number', hc.seat_number,
      'cards', hc.cards
    ))
    FROM poker_hole_cards hc
    WHERE hc.hand_id = _hand_id
  );
END;
$$;

-- ==================
-- RPC: commit_poker_state (atomic versioned write)
-- ==================
CREATE OR REPLACE FUNCTION public.commit_poker_state(
  _hand_id UUID,
  _expected_version INTEGER,
  _new_phase TEXT,
  _community_cards JSONB,
  _pots JSONB,
  _current_actor_seat INTEGER,
  _current_bet INTEGER,
  _min_raise INTEGER,
  _action_deadline TIMESTAMPTZ,
  _completed_at TIMESTAMPTZ,
  _results JSONB,
  _deck_seed_revealed TEXT,
  _seat_updates JSONB,
  _action_record JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _seat JSONB;
BEGIN
  -- Atomic version check + update
  UPDATE poker_hands SET
    phase = _new_phase::poker_hand_phase,
    community_cards = _community_cards,
    pots = _pots,
    current_actor_seat = _current_actor_seat,
    current_bet = _current_bet,
    min_raise = _min_raise,
    action_deadline = _action_deadline,
    state_version = state_version + 1,
    completed_at = _completed_at,
    results = _results,
    deck_seed_revealed = _deck_seed_revealed
  WHERE id = _hand_id
    AND state_version = _expected_version;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'version_conflict');
  END IF;

  -- Update seats
  IF _seat_updates IS NOT NULL THEN
    FOR _seat IN SELECT * FROM jsonb_array_elements(_seat_updates)
    LOOP
      UPDATE poker_seats SET
        stack = (_seat->>'stack')::INTEGER,
        status = (_seat->>'status')::poker_seat_status,
        consecutive_timeouts = COALESCE((_seat->>'consecutive_timeouts')::INTEGER, consecutive_timeouts),
        last_action_at = now()
      WHERE id = (_seat->>'seat_id')::UUID;
    END LOOP;
  END IF;

  -- Insert action record
  IF _action_record IS NOT NULL THEN
    INSERT INTO poker_actions (hand_id, player_id, seat_number, action_type, amount, phase, sequence)
    VALUES (
      _hand_id,
      (_action_record->>'player_id')::UUID,
      (_action_record->>'seat_number')::INTEGER,
      (_action_record->>'action_type')::poker_action_type,
      COALESCE((_action_record->>'amount')::INTEGER, 0),
      (_action_record->>'phase')::poker_hand_phase,
      (_action_record->>'sequence')::INTEGER
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'state_version', _expected_version + 1
  );
END;
$$;

-- ==================
-- Trigger: updated_at on poker_tables
-- ==================
CREATE TRIGGER update_poker_tables_updated_at
  BEFORE UPDATE ON public.poker_tables
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
