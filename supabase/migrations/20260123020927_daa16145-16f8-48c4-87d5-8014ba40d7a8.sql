-- Fix historical game data to match Excel spreadsheet
-- This updates game_players finish_positions and payout_structures amounts

-- First, let's update the finish positions for 2024 games
-- Note: We need to find the correct player IDs based on display_name and session

-- January 2024: Mati 1st (£58), Damian 2nd (£47) - Currently shows Amir 1st
UPDATE game_players gp
SET finish_position = 1
FROM game_sessions gs
JOIN events e ON gs.event_id = e.id
WHERE gp.game_session_id = gs.id
  AND gp.display_name = 'Mati'
  AND e.title ILIKE '%stycz%2024%' OR (EXTRACT(MONTH FROM e.final_date) = 1 AND EXTRACT(YEAR FROM e.final_date) = 2024);

UPDATE game_players gp
SET finish_position = 2
FROM game_sessions gs
JOIN events e ON gs.event_id = e.id
WHERE gp.game_session_id = gs.id
  AND gp.display_name = 'Damian'
  AND e.title ILIKE '%stycz%2024%' OR (EXTRACT(MONTH FROM e.final_date) = 1 AND EXTRACT(YEAR FROM e.final_date) = 2024);

UPDATE game_players gp
SET finish_position = NULL
FROM game_sessions gs
JOIN events e ON gs.event_id = e.id
WHERE gp.game_session_id = gs.id
  AND gp.display_name = 'Amir'
  AND e.title ILIKE '%stycz%2024%' OR (EXTRACT(MONTH FROM e.final_date) = 1 AND EXTRACT(YEAR FROM e.final_date) = 2024);

-- Update payout amounts for January 2024
UPDATE payout_structures ps
SET amount = 58
FROM game_players gp
JOIN game_sessions gs ON gp.game_session_id = gs.id
JOIN events e ON gs.event_id = e.id
WHERE ps.player_id = gp.id
  AND gp.display_name = 'Mati'
  AND ps.position = 1
  AND (e.title ILIKE '%stycz%2024%' OR (EXTRACT(MONTH FROM e.final_date) = 1 AND EXTRACT(YEAR FROM e.final_date) = 2024));

UPDATE payout_structures ps
SET amount = 47
FROM game_players gp
JOIN game_sessions gs ON gp.game_session_id = gs.id
JOIN events e ON gs.event_id = e.id
WHERE ps.player_id = gp.id
  AND gp.display_name = 'Damian'
  AND ps.position = 2
  AND (e.title ILIKE '%stycz%2024%' OR (EXTRACT(MONTH FROM e.final_date) = 1 AND EXTRACT(YEAR FROM e.final_date) = 2024));

-- February 2024: Amir 1st (£204), Puchar 2nd (£56)
UPDATE payout_structures ps
SET amount = 204
FROM game_players gp
JOIN game_sessions gs ON gp.game_session_id = gs.id
JOIN events e ON gs.event_id = e.id
WHERE ps.player_id = gp.id
  AND gp.display_name = 'Amir'
  AND ps.position = 1
  AND (e.title ILIKE '%lut%2024%' OR (EXTRACT(MONTH FROM e.final_date) = 2 AND EXTRACT(YEAR FROM e.final_date) = 2024));

UPDATE game_players gp
SET finish_position = 2
FROM game_sessions gs
JOIN events e ON gs.event_id = e.id
WHERE gp.game_session_id = gs.id
  AND gp.display_name = 'Puchar'
  AND (e.title ILIKE '%lut%2024%' OR (EXTRACT(MONTH FROM e.final_date) = 2 AND EXTRACT(YEAR FROM e.final_date) = 2024));

-- April 2024: Mati 1st (£210), Kuba 2nd (£115) - Currently shows Krystian 1st, Puchar 2nd
UPDATE game_players gp
SET finish_position = 1
FROM game_sessions gs
JOIN events e ON gs.event_id = e.id
WHERE gp.game_session_id = gs.id
  AND gp.display_name = 'Mati'
  AND (e.title ILIKE '%kwie%2024%' OR (EXTRACT(MONTH FROM e.final_date) = 4 AND EXTRACT(YEAR FROM e.final_date) = 2024));

UPDATE game_players gp
SET finish_position = 2
FROM game_sessions gs
JOIN events e ON gs.event_id = e.id
WHERE gp.game_session_id = gs.id
  AND gp.display_name = 'Kuba'
  AND (e.title ILIKE '%kwie%2024%' OR (EXTRACT(MONTH FROM e.final_date) = 4 AND EXTRACT(YEAR FROM e.final_date) = 2024));

UPDATE game_players gp
SET finish_position = NULL
FROM game_sessions gs
JOIN events e ON gs.event_id = e.id
WHERE gp.game_session_id = gs.id
  AND gp.display_name IN ('Krystian', 'Puchar')
  AND (e.title ILIKE '%kwie%2024%' OR (EXTRACT(MONTH FROM e.final_date) = 4 AND EXTRACT(YEAR FROM e.final_date) = 2024));

-- May 2024: Amir 1st (£150), Kadok 2nd (£85) - Currently shows Kris 1st, Krystian 2nd
UPDATE game_players gp
SET finish_position = 1
FROM game_sessions gs
JOIN events e ON gs.event_id = e.id
WHERE gp.game_session_id = gs.id
  AND gp.display_name = 'Amir'
  AND (e.title ILIKE '%maj%2024%' OR (EXTRACT(MONTH FROM e.final_date) = 5 AND EXTRACT(YEAR FROM e.final_date) = 2024));

UPDATE game_players gp
SET finish_position = 2
FROM game_sessions gs
JOIN events e ON gs.event_id = e.id
WHERE gp.game_session_id = gs.id
  AND gp.display_name = 'Kadok'
  AND (e.title ILIKE '%maj%2024%' OR (EXTRACT(MONTH FROM e.final_date) = 5 AND EXTRACT(YEAR FROM e.final_date) = 2024));

UPDATE game_players gp
SET finish_position = NULL
FROM game_sessions gs
JOIN events e ON gs.event_id = e.id
WHERE gp.game_session_id = gs.id
  AND gp.display_name IN ('Kris', 'Krystian')
  AND (e.title ILIKE '%maj%2024%' OR (EXTRACT(MONTH FROM e.final_date) = 5 AND EXTRACT(YEAR FROM e.final_date) = 2024));

-- July 2024: Kris 1st (£125), Amir 2nd (£120) - Currently shows Puchar 1st, Kadok 2nd
UPDATE game_players gp
SET finish_position = 1
FROM game_sessions gs
JOIN events e ON gs.event_id = e.id
WHERE gp.game_session_id = gs.id
  AND gp.display_name = 'Kris'
  AND (e.title ILIKE '%lip%2024%' OR (EXTRACT(MONTH FROM e.final_date) = 7 AND EXTRACT(YEAR FROM e.final_date) = 2024));

UPDATE game_players gp
SET finish_position = 2
FROM game_sessions gs
JOIN events e ON gs.event_id = e.id
WHERE gp.game_session_id = gs.id
  AND gp.display_name = 'Amir'
  AND (e.title ILIKE '%lip%2024%' OR (EXTRACT(MONTH FROM e.final_date) = 7 AND EXTRACT(YEAR FROM e.final_date) = 2024));

UPDATE game_players gp
SET finish_position = NULL
FROM game_sessions gs
JOIN events e ON gs.event_id = e.id
WHERE gp.game_session_id = gs.id
  AND gp.display_name IN ('Puchar', 'Kadok')
  AND (e.title ILIKE '%lip%2024%' OR (EXTRACT(MONTH FROM e.final_date) = 7 AND EXTRACT(YEAR FROM e.final_date) = 2024));

-- August 2024: Puchar 1st (£207), Krystian 2nd (£198) - Currently shows Kris 1st, Rafal Kuba 2nd
UPDATE game_players gp
SET finish_position = 1
FROM game_sessions gs
JOIN events e ON gs.event_id = e.id
WHERE gp.game_session_id = gs.id
  AND gp.display_name = 'Puchar'
  AND (e.title ILIKE '%sierp%2024%' OR (EXTRACT(MONTH FROM e.final_date) = 8 AND EXTRACT(YEAR FROM e.final_date) = 2024));

UPDATE game_players gp
SET finish_position = 2
FROM game_sessions gs
JOIN events e ON gs.event_id = e.id
WHERE gp.game_session_id = gs.id
  AND gp.display_name = 'Krystian'
  AND (e.title ILIKE '%sierp%2024%' OR (EXTRACT(MONTH FROM e.final_date) = 8 AND EXTRACT(YEAR FROM e.final_date) = 2024));

UPDATE game_players gp
SET finish_position = NULL
FROM game_sessions gs
JOIN events e ON gs.event_id = e.id
WHERE gp.game_session_id = gs.id
  AND gp.display_name IN ('Kris', 'Rafal Kuba')
  AND (e.title ILIKE '%sierp%2024%' OR (EXTRACT(MONTH FROM e.final_date) = 8 AND EXTRACT(YEAR FROM e.final_date) = 2024));

-- September 2024: Krystian 1st (£90) only - Currently shows Amir 1st, Damian 2nd
UPDATE game_players gp
SET finish_position = 1
FROM game_sessions gs
JOIN events e ON gs.event_id = e.id
WHERE gp.game_session_id = gs.id
  AND gp.display_name = 'Krystian'
  AND (e.title ILIKE '%wrzes%2024%' OR (EXTRACT(MONTH FROM e.final_date) = 9 AND EXTRACT(YEAR FROM e.final_date) = 2024));

UPDATE game_players gp
SET finish_position = NULL
FROM game_sessions gs
JOIN events e ON gs.event_id = e.id
WHERE gp.game_session_id = gs.id
  AND gp.display_name IN ('Amir', 'Damian')
  AND (e.title ILIKE '%wrzes%2024%' OR (EXTRACT(MONTH FROM e.final_date) = 9 AND EXTRACT(YEAR FROM e.final_date) = 2024));

-- November 2024: Amir 1st (£210), Krystian 2nd (£85) - Currently shows Mati 1st only
UPDATE game_players gp
SET finish_position = 1
FROM game_sessions gs
JOIN events e ON gs.event_id = e.id
WHERE gp.game_session_id = gs.id
  AND gp.display_name = 'Amir'
  AND (e.title ILIKE '%listop%2024%' OR (EXTRACT(MONTH FROM e.final_date) = 11 AND EXTRACT(YEAR FROM e.final_date) = 2024));

UPDATE game_players gp
SET finish_position = 2
FROM game_sessions gs
JOIN events e ON gs.event_id = e.id
WHERE gp.game_session_id = gs.id
  AND gp.display_name = 'Krystian'
  AND (e.title ILIKE '%listop%2024%' OR (EXTRACT(MONTH FROM e.final_date) = 11 AND EXTRACT(YEAR FROM e.final_date) = 2024));

UPDATE game_players gp
SET finish_position = NULL
FROM game_sessions gs
JOIN events e ON gs.event_id = e.id
WHERE gp.game_session_id = gs.id
  AND gp.display_name = 'Mati'
  AND (e.title ILIKE '%listop%2024%' OR (EXTRACT(MONTH FROM e.final_date) = 11 AND EXTRACT(YEAR FROM e.final_date) = 2024));

-- December 2024: Kris 1st (£315), Amir 2nd (£55) - Currently shows Amir 1st, Krystian 2nd
UPDATE game_players gp
SET finish_position = 1
FROM game_sessions gs
JOIN events e ON gs.event_id = e.id
WHERE gp.game_session_id = gs.id
  AND gp.display_name = 'Kris'
  AND (e.title ILIKE '%grud%2024%' OR (EXTRACT(MONTH FROM e.final_date) = 12 AND EXTRACT(YEAR FROM e.final_date) = 2024));

UPDATE game_players gp
SET finish_position = 2
FROM game_sessions gs
JOIN events e ON gs.event_id = e.id
WHERE gp.game_session_id = gs.id
  AND gp.display_name = 'Amir'
  AND (e.title ILIKE '%grud%2024%' OR (EXTRACT(MONTH FROM e.final_date) = 12 AND EXTRACT(YEAR FROM e.final_date) = 2024));

UPDATE game_players gp
SET finish_position = NULL
FROM game_sessions gs
JOIN events e ON gs.event_id = e.id
WHERE gp.game_session_id = gs.id
  AND gp.display_name = 'Krystian'
  AND (e.title ILIKE '%grud%2024%' OR (EXTRACT(MONTH FROM e.final_date) = 12 AND EXTRACT(YEAR FROM e.final_date) = 2024));

-- 2025 corrections

-- January 2025: Kris 1st (£295) only - Currently shows Wuzet 1st, Puchar 2nd
UPDATE game_players gp
SET finish_position = 1
FROM game_sessions gs
JOIN events e ON gs.event_id = e.id
WHERE gp.game_session_id = gs.id
  AND gp.display_name = 'Kris'
  AND (e.title ILIKE '%stycz%2025%' OR (EXTRACT(MONTH FROM e.final_date) = 1 AND EXTRACT(YEAR FROM e.final_date) = 2025));

UPDATE game_players gp
SET finish_position = NULL
FROM game_sessions gs
JOIN events e ON gs.event_id = e.id
WHERE gp.game_session_id = gs.id
  AND gp.display_name IN ('Wuzet', 'Puchar')
  AND (e.title ILIKE '%stycz%2025%' OR (EXTRACT(MONTH FROM e.final_date) = 1 AND EXTRACT(YEAR FROM e.final_date) = 2025));

-- February 2025: Rafal Kuba 1st (£225), Puchar 2nd (£130) - Currently shows Krystian 1st, Mati 2nd
UPDATE game_players gp
SET finish_position = 1
FROM game_sessions gs
JOIN events e ON gs.event_id = e.id
WHERE gp.game_session_id = gs.id
  AND gp.display_name = 'Rafal Kuba'
  AND (e.title ILIKE '%lut%2025%' OR (EXTRACT(MONTH FROM e.final_date) = 2 AND EXTRACT(YEAR FROM e.final_date) = 2025));

UPDATE game_players gp
SET finish_position = 2
FROM game_sessions gs
JOIN events e ON gs.event_id = e.id
WHERE gp.game_session_id = gs.id
  AND gp.display_name = 'Puchar'
  AND (e.title ILIKE '%lut%2025%' OR (EXTRACT(MONTH FROM e.final_date) = 2 AND EXTRACT(YEAR FROM e.final_date) = 2025));

UPDATE game_players gp
SET finish_position = NULL
FROM game_sessions gs
JOIN events e ON gs.event_id = e.id
WHERE gp.game_session_id = gs.id
  AND gp.display_name IN ('Krystian', 'Mati')
  AND (e.title ILIKE '%lut%2025%' OR (EXTRACT(MONTH FROM e.final_date) = 2 AND EXTRACT(YEAR FROM e.final_date) = 2025));

-- April 2025: Kadok 1st (£220), Kuba 2nd (£65) - Currently shows Krystian 1st, Amir 2nd
UPDATE game_players gp
SET finish_position = 1
FROM game_sessions gs
JOIN events e ON gs.event_id = e.id
WHERE gp.game_session_id = gs.id
  AND gp.display_name = 'Kadok'
  AND (e.title ILIKE '%kwie%2025%' OR (EXTRACT(MONTH FROM e.final_date) = 4 AND EXTRACT(YEAR FROM e.final_date) = 2025));

UPDATE game_players gp
SET finish_position = 2
FROM game_sessions gs
JOIN events e ON gs.event_id = e.id
WHERE gp.game_session_id = gs.id
  AND gp.display_name = 'Kuba'
  AND (e.title ILIKE '%kwie%2025%' OR (EXTRACT(MONTH FROM e.final_date) = 4 AND EXTRACT(YEAR FROM e.final_date) = 2025));

UPDATE game_players gp
SET finish_position = NULL
FROM game_sessions gs
JOIN events e ON gs.event_id = e.id
WHERE gp.game_session_id = gs.id
  AND gp.display_name IN ('Krystian', 'Amir')
  AND (e.title ILIKE '%kwie%2025%' OR (EXTRACT(MONTH FROM e.final_date) = 4 AND EXTRACT(YEAR FROM e.final_date) = 2025));

-- May 2025: Borys 1st (£150), Amir 2nd (£50) - Currently shows Kris 1st, Mati 2nd
UPDATE game_players gp
SET finish_position = 1
FROM game_sessions gs
JOIN events e ON gs.event_id = e.id
WHERE gp.game_session_id = gs.id
  AND gp.display_name = 'Borys'
  AND (e.title ILIKE '%maj%2025%' OR (EXTRACT(MONTH FROM e.final_date) = 5 AND EXTRACT(YEAR FROM e.final_date) = 2025));

UPDATE game_players gp
SET finish_position = 2
FROM game_sessions gs
JOIN events e ON gs.event_id = e.id
WHERE gp.game_session_id = gs.id
  AND gp.display_name = 'Amir'
  AND (e.title ILIKE '%maj%2025%' OR (EXTRACT(MONTH FROM e.final_date) = 5 AND EXTRACT(YEAR FROM e.final_date) = 2025));

UPDATE game_players gp
SET finish_position = NULL
FROM game_sessions gs
JOIN events e ON gs.event_id = e.id
WHERE gp.game_session_id = gs.id
  AND gp.display_name IN ('Kris', 'Mati')
  AND (e.title ILIKE '%maj%2025%' OR (EXTRACT(MONTH FROM e.final_date) = 5 AND EXTRACT(YEAR FROM e.final_date) = 2025));

-- June 2025: Krystian 1st (£250), Breku 2nd (£40) - Currently shows Kadok 1st, Breku 2nd
UPDATE game_players gp
SET finish_position = 1
FROM game_sessions gs
JOIN events e ON gs.event_id = e.id
WHERE gp.game_session_id = gs.id
  AND gp.display_name = 'Krystian'
  AND (e.title ILIKE '%czerw%2025%' OR (EXTRACT(MONTH FROM e.final_date) = 6 AND EXTRACT(YEAR FROM e.final_date) = 2025));

UPDATE game_players gp
SET finish_position = NULL
FROM game_sessions gs
JOIN events e ON gs.event_id = e.id
WHERE gp.game_session_id = gs.id
  AND gp.display_name = 'Kadok'
  AND (e.title ILIKE '%czerw%2025%' OR (EXTRACT(MONTH FROM e.final_date) = 6 AND EXTRACT(YEAR FROM e.final_date) = 2025));

-- July 2025: Amir 1st (£300), Breku 2nd (£210) - Currently shows Rafal Kuba 1st, Breku 2nd
UPDATE game_players gp
SET finish_position = 1
FROM game_sessions gs
JOIN events e ON gs.event_id = e.id
WHERE gp.game_session_id = gs.id
  AND gp.display_name = 'Amir'
  AND (e.title ILIKE '%lip%2025%' OR (EXTRACT(MONTH FROM e.final_date) = 7 AND EXTRACT(YEAR FROM e.final_date) = 2025));

UPDATE game_players gp
SET finish_position = NULL
FROM game_sessions gs
JOIN events e ON gs.event_id = e.id
WHERE gp.game_session_id = gs.id
  AND gp.display_name = 'Rafal Kuba'
  AND (e.title ILIKE '%lip%2025%' OR (EXTRACT(MONTH FROM e.final_date) = 7 AND EXTRACT(YEAR FROM e.final_date) = 2025));

-- September 2025: Wuzet 1st (£300), Mati 2nd (£165) - Currently shows Mati 1st only
UPDATE game_players gp
SET finish_position = 1
FROM game_sessions gs
JOIN events e ON gs.event_id = e.id
WHERE gp.game_session_id = gs.id
  AND gp.display_name = 'Wuzet'
  AND (e.title ILIKE '%wrzes%2025%' OR (EXTRACT(MONTH FROM e.final_date) = 9 AND EXTRACT(YEAR FROM e.final_date) = 2025));

UPDATE game_players gp
SET finish_position = 2
FROM game_sessions gs
JOIN events e ON gs.event_id = e.id
WHERE gp.game_session_id = gs.id
  AND gp.display_name = 'Mati'
  AND (e.title ILIKE '%wrzes%2025%' OR (EXTRACT(MONTH FROM e.final_date) = 9 AND EXTRACT(YEAR FROM e.final_date) = 2025));

-- November 2025: Krystian 1st (£1090), Breku 2nd (£100) - Currently shows Amir 1st only
UPDATE game_players gp
SET finish_position = 1
FROM game_sessions gs
JOIN events e ON gs.event_id = e.id
WHERE gp.game_session_id = gs.id
  AND gp.display_name = 'Krystian'
  AND (e.title ILIKE '%listop%2025%' OR (EXTRACT(MONTH FROM e.final_date) = 11 AND EXTRACT(YEAR FROM e.final_date) = 2025));

UPDATE game_players gp
SET finish_position = 2
FROM game_sessions gs
JOIN events e ON gs.event_id = e.id
WHERE gp.game_session_id = gs.id
  AND gp.display_name = 'Breku'
  AND (e.title ILIKE '%listop%2025%' OR (EXTRACT(MONTH FROM e.final_date) = 11 AND EXTRACT(YEAR FROM e.final_date) = 2025));

UPDATE game_players gp
SET finish_position = NULL
FROM game_sessions gs
JOIN events e ON gs.event_id = e.id
WHERE gp.game_session_id = gs.id
  AND gp.display_name = 'Amir'
  AND (e.title ILIKE '%listop%2025%' OR (EXTRACT(MONTH FROM e.final_date) = 11 AND EXTRACT(YEAR FROM e.final_date) = 2025));

-- December 2025: Breku 1st (£365), Mati 2nd (£180) - Currently shows Breku 1st only
UPDATE game_players gp
SET finish_position = 2
FROM game_sessions gs
JOIN events e ON gs.event_id = e.id
WHERE gp.game_session_id = gs.id
  AND gp.display_name = 'Mati'
  AND (e.title ILIKE '%grud%2025%' OR (EXTRACT(MONTH FROM e.final_date) = 12 AND EXTRACT(YEAR FROM e.final_date) = 2025));