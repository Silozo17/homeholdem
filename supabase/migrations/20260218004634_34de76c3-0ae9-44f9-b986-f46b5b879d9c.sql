
-- Add columns to poker_tables
ALTER TABLE public.poker_tables ADD COLUMN IF NOT EXISTS description TEXT DEFAULT NULL;
ALTER TABLE public.poker_tables ADD COLUMN IF NOT EXISTS is_persistent BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.poker_tables ADD COLUMN IF NOT EXISTS closing_at TIMESTAMPTZ DEFAULT NULL;

-- Drop existing SELECT policy
DROP POLICY IF EXISTS "Users can view relevant tables" ON public.poker_tables;

-- Create new SELECT policy with private and community visibility
CREATE POLICY "Users can view relevant tables" ON public.poker_tables
FOR SELECT USING (
  (table_type IN ('public', 'community'))
  OR (created_by = auth.uid())
  OR (table_type = 'friends' AND EXISTS (
    SELECT 1 FROM poker_seats ps WHERE ps.table_id = poker_tables.id AND ps.player_id = auth.uid()
  ))
  OR (table_type = 'private' AND EXISTS (
    SELECT 1 FROM poker_seats ps WHERE ps.table_id = poker_tables.id AND ps.player_id = auth.uid()
  ))
  OR (table_type = 'club' AND club_id IS NOT NULL AND is_club_member(auth.uid(), club_id))
);
