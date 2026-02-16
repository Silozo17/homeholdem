-- Drop the existing SELECT policy on poker_tables and recreate with friends visibility
DROP POLICY IF EXISTS "Users can view relevant tables" ON public.poker_tables;

CREATE POLICY "Users can view relevant tables"
ON public.poker_tables
FOR SELECT
TO authenticated
USING (
  -- Public tables visible to everyone
  table_type = 'public'
  -- Creator can always see their own tables
  OR created_by = auth.uid()
  -- Club tables visible to club members
  OR (club_id IS NOT NULL AND is_club_member(auth.uid(), club_id))
  -- User is already seated at the table
  OR EXISTS (
    SELECT 1 FROM poker_seats ps
    WHERE ps.table_id = poker_tables.id AND ps.player_id = auth.uid()
  )
  -- Friends tables visible to users who share a club with the creator
  OR (
    table_type = 'friends' AND EXISTS (
      SELECT 1 FROM club_members cm1
      JOIN club_members cm2 ON cm1.club_id = cm2.club_id
      WHERE cm1.user_id = auth.uid() AND cm2.user_id = poker_tables.created_by
    )
  )
);