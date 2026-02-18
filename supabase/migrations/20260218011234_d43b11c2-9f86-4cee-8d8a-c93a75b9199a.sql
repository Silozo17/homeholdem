DROP POLICY IF EXISTS "View seats at accessible tables" ON poker_seats;

CREATE POLICY "View seats at accessible tables" ON poker_seats
  FOR SELECT USING (
    player_id = auth.uid()
    OR (EXISTS (
      SELECT 1 FROM poker_tables t
      WHERE t.id = poker_seats.table_id
      AND (
        t.table_type IN ('public', 'community')
        OR t.created_by = auth.uid()
        OR (t.club_id IS NOT NULL AND is_club_member(auth.uid(), t.club_id))
      )
    ))
  );