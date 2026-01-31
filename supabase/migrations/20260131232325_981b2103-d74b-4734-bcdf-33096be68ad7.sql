-- Add display_mode column to clubs table
ALTER TABLE public.clubs ADD COLUMN IF NOT EXISTS display_mode TEXT DEFAULT 'cash' CHECK (display_mode IN ('cash', 'chips'));

-- Add comment for documentation
COMMENT ON COLUMN public.clubs.display_mode IS 'How values are displayed in games: cash (real money) or chips (tournament chips)';