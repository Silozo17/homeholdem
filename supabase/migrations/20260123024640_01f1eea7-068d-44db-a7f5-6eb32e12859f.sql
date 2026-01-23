
-- First, clear all existing season_standings for The Royal Poles club
DELETE FROM season_standings
WHERE season_id IN (
  SELECT s.id FROM seasons s
  WHERE s.club_id = 'a73ed1c7-a584-4f42-ae74-f019cffad3c2'
);

-- Recalculate Season 1 (2024) standings from game_players
WITH season1_stats AS (
  SELECT 
    COALESCE(gp.placeholder_player_id, gp.user_id::uuid) as player_key,
    CASE WHEN gp.placeholder_player_id IS NOT NULL THEN gp.placeholder_player_id ELSE NULL END as placeholder_player_id,
    CASE WHEN gp.placeholder_player_id IS NULL THEN gp.user_id ELSE NULL END as user_id,
    COUNT(*) as games_played,
    SUM(CASE WHEN gp.finish_position = 1 THEN 1 ELSE 0 END) as wins,
    SUM(CASE WHEN gp.finish_position = 2 THEN 1 ELSE 0 END) as second_places,
    SUM(CASE WHEN gp.finish_position = 3 THEN 1 ELSE 0 END) as third_places,
    COALESCE(SUM(ps.amount), 0) as total_winnings
  FROM game_players gp
  JOIN game_sessions gs ON gp.game_session_id = gs.id
  JOIN events e ON gs.event_id = e.id
  LEFT JOIN payout_structures ps ON ps.player_id = gp.id
  WHERE e.club_id = 'a73ed1c7-a584-4f42-ae74-f019cffad3c2'
    AND e.final_date >= '2024-01-01'
    AND e.final_date < '2025-01-01'
    AND (gp.placeholder_player_id IS NOT NULL OR gp.user_id IS NOT NULL)
  GROUP BY COALESCE(gp.placeholder_player_id, gp.user_id::uuid),
           CASE WHEN gp.placeholder_player_id IS NOT NULL THEN gp.placeholder_player_id ELSE NULL END,
           CASE WHEN gp.placeholder_player_id IS NULL THEN gp.user_id ELSE NULL END
)
INSERT INTO season_standings (
  season_id, 
  placeholder_player_id, 
  user_id, 
  games_played, 
  wins, 
  second_places, 
  third_places,
  total_winnings,
  total_points
)
SELECT 
  'ef693e74-4024-40e1-9b75-3ef8003a6ffa',
  placeholder_player_id,
  user_id,
  games_played,
  wins,
  second_places,
  third_places,
  total_winnings,
  (wins * 10) + (second_places * 7) + (third_places * 5) + games_played as total_points
FROM season1_stats;

-- Recalculate Season 2 (2025) standings from game_players
WITH season2_stats AS (
  SELECT 
    COALESCE(gp.placeholder_player_id, gp.user_id::uuid) as player_key,
    CASE WHEN gp.placeholder_player_id IS NOT NULL THEN gp.placeholder_player_id ELSE NULL END as placeholder_player_id,
    CASE WHEN gp.placeholder_player_id IS NULL THEN gp.user_id ELSE NULL END as user_id,
    COUNT(*) as games_played,
    SUM(CASE WHEN gp.finish_position = 1 THEN 1 ELSE 0 END) as wins,
    SUM(CASE WHEN gp.finish_position = 2 THEN 1 ELSE 0 END) as second_places,
    SUM(CASE WHEN gp.finish_position = 3 THEN 1 ELSE 0 END) as third_places,
    COALESCE(SUM(ps.amount), 0) as total_winnings
  FROM game_players gp
  JOIN game_sessions gs ON gp.game_session_id = gs.id
  JOIN events e ON gs.event_id = e.id
  LEFT JOIN payout_structures ps ON ps.player_id = gp.id
  WHERE e.club_id = 'a73ed1c7-a584-4f42-ae74-f019cffad3c2'
    AND e.final_date >= '2025-01-01'
    AND e.final_date < '2026-01-01'
    AND (gp.placeholder_player_id IS NOT NULL OR gp.user_id IS NOT NULL)
  GROUP BY COALESCE(gp.placeholder_player_id, gp.user_id::uuid),
           CASE WHEN gp.placeholder_player_id IS NOT NULL THEN gp.placeholder_player_id ELSE NULL END,
           CASE WHEN gp.placeholder_player_id IS NULL THEN gp.user_id ELSE NULL END
)
INSERT INTO season_standings (
  season_id, 
  placeholder_player_id, 
  user_id, 
  games_played, 
  wins, 
  second_places, 
  third_places,
  total_winnings,
  total_points
)
SELECT 
  'e5b17f82-7649-4239-9e0e-a5d2535eb423',
  placeholder_player_id,
  user_id,
  games_played,
  wins,
  second_places,
  third_places,
  total_winnings,
  (wins * 10) + (second_places * 7) + (third_places * 5) + games_played as total_points
FROM season2_stats;
