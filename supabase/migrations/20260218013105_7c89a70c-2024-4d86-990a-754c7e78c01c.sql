
-- ============================================================
-- Paid Tournaments Schema
-- ============================================================

-- Table: paid_tournaments
CREATE TABLE public.paid_tournaments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','scheduled','running','complete','cancelled')),
  entry_fee_pence integer NOT NULL CHECK (entry_fee_pence > 0),
  max_players integer NOT NULL CHECK (max_players >= 9 AND max_players <= 900),
  starting_stack integer NOT NULL DEFAULT 5000,
  starting_sb integer NOT NULL DEFAULT 25,
  starting_bb integer NOT NULL DEFAULT 50,
  starting_ante integer NOT NULL DEFAULT 0,
  blind_interval_minutes integer NOT NULL DEFAULT 15,
  current_blind_level integer NOT NULL DEFAULT 0,
  level_started_at timestamptz,
  payout_preset text NOT NULL DEFAULT 'winner_takes_all'
    CHECK (payout_preset IN ('winner_takes_all','top_2','top_3')),
  payout_structure jsonb NOT NULL DEFAULT '[]'::jsonb,
  start_at timestamptz NOT NULL,
  started_at timestamptz,
  completed_at timestamptz,
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.paid_tournaments ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can view tournaments
CREATE POLICY "Authenticated users can view paid tournaments"
  ON public.paid_tournaments FOR SELECT TO authenticated
  USING (true);

-- No client INSERT/UPDATE/DELETE (admin uses service role in edge functions)

-- Table: paid_tournament_registrations
CREATE TABLE public.paid_tournament_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id uuid NOT NULL REFERENCES public.paid_tournaments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  paid_amount_pence integer NOT NULL DEFAULT 0,
  stripe_checkout_session_id text,
  stripe_payment_intent_id text,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','paid','cancelled','refunded')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tournament_id, user_id)
);

ALTER TABLE public.paid_tournament_registrations ENABLE ROW LEVEL SECURITY;

-- Users can see own registrations
CREATE POLICY "Users can view own registrations"
  ON public.paid_tournament_registrations FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- App admins can view all registrations
CREATE POLICY "Admins can view all registrations"
  ON public.paid_tournament_registrations FOR SELECT TO authenticated
  USING (is_app_admin(auth.uid()));

-- Table: paid_tournament_payouts
CREATE TABLE public.paid_tournament_payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id uuid NOT NULL REFERENCES public.paid_tournaments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  position integer NOT NULL,
  amount_pence integer NOT NULL,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','paid')),
  due_at timestamptz NOT NULL,
  paid_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.paid_tournament_payouts ENABLE ROW LEVEL SECURITY;

-- Users can see own payouts
CREATE POLICY "Users can view own payouts"
  ON public.paid_tournament_payouts FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Admins can view all payouts
CREATE POLICY "Admins can view all payouts"
  ON public.paid_tournament_payouts FOR SELECT TO authenticated
  USING (is_app_admin(auth.uid()));

-- Add paid_tournament_id to poker_tables
ALTER TABLE public.poker_tables
  ADD COLUMN IF NOT EXISTS paid_tournament_id uuid REFERENCES public.paid_tournaments(id);

-- Race-safe registration count function
CREATE OR REPLACE FUNCTION public.check_tournament_capacity(_tournament_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _count integer;
  _max integer;
BEGIN
  SELECT max_players INTO _max FROM paid_tournaments WHERE id = _tournament_id FOR UPDATE;
  IF NOT FOUND THEN RETURN -1; END IF;
  SELECT count(*) INTO _count FROM paid_tournament_registrations
    WHERE tournament_id = _tournament_id AND status IN ('pending','paid');
  RETURN _max - _count;
END;
$$;

-- Updated_at trigger for paid_tournaments
CREATE TRIGGER update_paid_tournaments_updated_at
  BEFORE UPDATE ON public.paid_tournaments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
