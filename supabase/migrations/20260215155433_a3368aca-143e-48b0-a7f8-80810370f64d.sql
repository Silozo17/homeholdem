CREATE TABLE public.poker_play_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL DEFAULT auth.uid(),
  club_id UUID REFERENCES public.clubs(id) ON DELETE SET NULL,
  hands_played INTEGER NOT NULL DEFAULT 0,
  hands_won INTEGER NOT NULL DEFAULT 0,
  biggest_pot INTEGER DEFAULT 0,
  best_hand_rank INTEGER DEFAULT 0,
  best_hand_name TEXT DEFAULT '',
  final_chips INTEGER NOT NULL DEFAULT 0,
  starting_chips INTEGER NOT NULL DEFAULT 0,
  bot_count INTEGER NOT NULL DEFAULT 0,
  game_mode TEXT NOT NULL DEFAULT 'bots',
  duration_seconds INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.poker_play_results ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_poker_results_user_date
  ON public.poker_play_results (user_id, created_at DESC);

CREATE POLICY "Users view own poker results"
  ON public.poker_play_results FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users insert own poker results"
  ON public.poker_play_results FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());