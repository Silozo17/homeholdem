-- Fix corrupted game_players records where user_id doesn't match the placeholder's linked_user_id
-- This fixes the bug where Amir shows 7 wins instead of 6

-- Clear user_id from game_players where:
-- 1. Both user_id and placeholder_player_id are set
-- 2. But the placeholder's linked_user_id doesn't match the game_player's user_id
UPDATE game_players gp
SET user_id = NULL
FROM placeholder_players pp
WHERE gp.placeholder_player_id = pp.id
  AND gp.user_id IS NOT NULL
  AND (pp.linked_user_id IS NULL OR pp.linked_user_id != gp.user_id);