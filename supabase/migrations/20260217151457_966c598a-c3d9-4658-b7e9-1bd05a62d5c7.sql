
ALTER TABLE public.poker_tables
  ADD COLUMN IF NOT EXISTS blind_level integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS original_small_blind integer,
  ADD COLUMN IF NOT EXISTS original_big_blind integer,
  ADD COLUMN IF NOT EXISTS last_blind_increase_at timestamptz NOT NULL DEFAULT now();

-- Backfill originals from current values
UPDATE public.poker_tables
SET original_small_blind = small_blind,
    original_big_blind = big_blind
WHERE original_small_blind IS NULL;
