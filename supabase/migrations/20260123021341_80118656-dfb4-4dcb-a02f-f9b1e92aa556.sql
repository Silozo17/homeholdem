
-- Add currency column to clubs table
ALTER TABLE public.clubs ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'GBP';

-- Add currency column to user_preferences table  
ALTER TABLE public.user_preferences ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'GBP';

-- Fix Amir's finish positions based on Excel data
-- Feb 2024: Amir won with £204
UPDATE game_players 
SET finish_position = 1 
WHERE game_session_id IN (
  SELECT gs.id FROM game_sessions gs 
  JOIN events e ON e.id = gs.event_id 
  WHERE e.title = 'Luty 2024'
) AND (placeholder_player_id = 'e0a569e1-8e37-4d7c-a195-3fec01f3d458' OR display_name = 'Amir')
AND finish_position IS NULL;

-- March 2024: Amir won with £140
UPDATE game_players 
SET finish_position = 1 
WHERE game_session_id IN (
  SELECT gs.id FROM game_sessions gs 
  JOIN events e ON e.id = gs.event_id 
  WHERE e.title = 'Marzec 2024'
) AND (placeholder_player_id = 'e0a569e1-8e37-4d7c-a195-3fec01f3d458' OR display_name = 'Amir')
AND finish_position IS NULL;

-- Aug 2025: Amir won with £160
UPDATE game_players 
SET finish_position = 1 
WHERE game_session_id IN (
  SELECT gs.id FROM game_sessions gs 
  JOIN events e ON e.id = gs.event_id 
  WHERE e.title = 'Sierpień 2025'
) AND (placeholder_player_id = 'e0a569e1-8e37-4d7c-a195-3fec01f3d458' OR display_name = 'Amir')
AND finish_position IS NULL;

-- Fix other missing finish positions based on Excel
-- March 2025: Amir was 2nd with £170 (Mati won with £210)
UPDATE game_players 
SET finish_position = 2 
WHERE game_session_id IN (
  SELECT gs.id FROM game_sessions gs 
  JOIN events e ON e.id = gs.event_id 
  WHERE e.title = 'Marzec 2025'
) AND (placeholder_player_id = 'e0a569e1-8e37-4d7c-a195-3fec01f3d458' OR display_name = 'Amir')
AND finish_position IS NULL;

-- May 2025: Amir was 2nd with £50 (Damian won with £150)
UPDATE game_players 
SET finish_position = 2 
WHERE game_session_id IN (
  SELECT gs.id FROM game_sessions gs 
  JOIN events e ON e.id = gs.event_id 
  WHERE e.title = 'Maj 2025'
) AND (placeholder_player_id = 'e0a569e1-8e37-4d7c-a195-3fec01f3d458' OR display_name = 'Amir')
AND finish_position IS NULL;

-- Fix all remaining NULL finish_positions for players who didn't cash
UPDATE game_players 
SET finish_position = 99 
WHERE finish_position IS NULL;
