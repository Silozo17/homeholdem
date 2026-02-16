-- Drop the recursive poker_seats policy
DROP POLICY IF EXISTS "View seats at accessible tables" ON poker_seats;

-- Replace with a simple non-recursive policy
CREATE POLICY "View seats at accessible tables"
  ON poker_seats FOR SELECT TO authenticated
  USING (
    player_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM poker_tables t
      WHERE t.id = poker_seats.table_id
      AND (
        t.table_type = 'public'
        OR t.created_by = auth.uid()
        OR (t.club_id IS NOT NULL AND is_club_member(auth.uid(), t.club_id))
      )
    )
  );

-- Drop duplicate poker_tables policy
DROP POLICY IF EXISTS "View public and own tables" ON poker_tables;

-- Update remaining poker_tables policy to avoid sub-selecting poker_seats
DROP POLICY IF EXISTS "Users can view relevant tables" ON poker_tables;
CREATE POLICY "Users can view relevant tables"
  ON poker_tables FOR SELECT TO authenticated
  USING (
    table_type = 'public'
    OR created_by = auth.uid()
    OR (club_id IS NOT NULL AND is_club_member(auth.uid(), club_id))
    OR (table_type = 'friends' AND EXISTS (
      SELECT 1 FROM club_members cm1
      JOIN club_members cm2 ON cm1.club_id = cm2.club_id
      WHERE cm1.user_id = auth.uid() AND cm2.user_id = poker_tables.created_by
    ))
  );