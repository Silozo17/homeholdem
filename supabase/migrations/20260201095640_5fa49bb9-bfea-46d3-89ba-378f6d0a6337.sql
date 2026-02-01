-- Persist end-game prize pool override so history/leaderboards can display the correct total
ALTER TABLE public.game_sessions
ADD COLUMN IF NOT EXISTS prize_pool_override integer;

COMMENT ON COLUMN public.game_sessions.prize_pool_override IS 'Optional manual override for the tournament prize pool total, set at game end.';