CREATE UNIQUE INDEX IF NOT EXISTS one_active_hand_per_table
ON poker_hands(table_id)
WHERE completed_at IS NULL;