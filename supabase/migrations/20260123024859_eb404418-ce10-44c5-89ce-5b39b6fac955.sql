
-- Clear and recalculate Season 2 (2025) standings
DELETE FROM season_standings
WHERE season_id = 'e5b17f82-7649-4239-9e0e-a5d2535eb423';

WITH season2_stats AS (
  SELECT 
    gp.placeholder_player_id,
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
    AND gp.placeholder_player_id IS NOT NULL
  GROUP BY gp.placeholder_player_id
)
INSERT INTO season_standings (
  season_id, 
  placeholder_player_id, 
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
  games_played,
  wins,
  second_places,
  third_places,
  total_winnings,
  (wins * 10) + (second_places * 7) + (third_places * 5) + games_played as total_points
FROM season2_stats;
