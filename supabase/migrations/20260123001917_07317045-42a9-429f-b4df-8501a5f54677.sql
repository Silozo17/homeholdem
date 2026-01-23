
-- Add placeholder_player_id column to game_players
ALTER TABLE game_players ADD COLUMN placeholder_player_id uuid REFERENCES placeholder_players(id);

-- Make user_id nullable
ALTER TABLE game_players ALTER COLUMN user_id DROP NOT NULL;

-- Link registered users to their placeholder_players
UPDATE placeholder_players SET linked_user_id = '9255cdbf-e1ee-4fd0-b099-3bf8dd7a4291' 
  WHERE id = 'e0a569e1-8e37-4d7c-a195-3fec01f3d458'; -- Amir
UPDATE placeholder_players SET linked_user_id = '7672bfb9-a422-47aa-953e-bff648f66eea' 
  WHERE id = '885389fb-e07f-4d76-845d-aea257a90d49'; -- Kuba
UPDATE placeholder_players SET linked_user_id = 'f1e0cfa9-7ccd-441c-88e2-355b063ef9fb' 
  WHERE id = 'ad8c1070-ce10-4613-9299-4436e04a267d'; -- Borys

-- Update existing game_players to use placeholder_player_id instead of hardcoded user_id
-- And set user_id to NULL (will be linked via placeholder)

-- Styczen 2024 - Amir (1st)
UPDATE game_players SET placeholder_player_id = 'e0a569e1-8e37-4d7c-a195-3fec01f3d458', user_id = NULL
  WHERE id = '4a16d9cc-db59-4580-8bf7-335ebbe15286';

-- Luty 2024 - Amir (1st)
UPDATE game_players SET placeholder_player_id = 'e0a569e1-8e37-4d7c-a195-3fec01f3d458', user_id = NULL
  WHERE id = '1b22b8ed-8105-4cbc-82da-070a1037eb2e';

-- Marzec 2024 - Puchar (1st)
UPDATE game_players SET placeholder_player_id = '33015400-8383-48c3-b857-326fc076b7b3', user_id = NULL
  WHERE id = '1349cb59-4696-4f11-a6f0-43c6b2745d21';

-- Kwiecien 2024 - Krystian (1st)
UPDATE game_players SET placeholder_player_id = 'af9eadaf-213d-42d8-9814-ec2c3a406f35', user_id = NULL
  WHERE id = 'd6426e18-5ac6-4d7f-8bff-04523e8be042';

-- Maj 2024 - Kris (1st)
UPDATE game_players SET placeholder_player_id = '1f5c9dbe-9de1-49fc-8202-2b8931ac1564', user_id = NULL
  WHERE id = '9cb013ca-a600-476a-be31-a222c6178410';

-- Czerwiec 2024 - Mati (1st)
UPDATE game_players SET placeholder_player_id = '34022ad2-039a-4449-87e9-8825606e214a', user_id = NULL
  WHERE id = '2398b5b0-5a69-4a4b-b3db-4a45a5097e16';

-- Lipiec 2024 - Puchar (1st)
UPDATE game_players SET placeholder_player_id = '33015400-8383-48c3-b857-326fc076b7b3', user_id = NULL
  WHERE id = '8d20c6de-f111-4c05-9523-013509f3f1c9';

-- Sierpien 2024 - Kris (1st)
UPDATE game_players SET placeholder_player_id = '1f5c9dbe-9de1-49fc-8202-2b8931ac1564', user_id = NULL
  WHERE id = '613c4f21-c5da-469f-91f5-8296a798f455';

-- Wrzesien 2024 - Amir (1st)
UPDATE game_players SET placeholder_player_id = 'e0a569e1-8e37-4d7c-a195-3fec01f3d458', user_id = NULL
  WHERE id = '8339ebfb-2aab-4032-bac0-ae7f978791c6';

-- Pazdziernik 2024 - Mati (1st)
UPDATE game_players SET placeholder_player_id = '34022ad2-039a-4449-87e9-8825606e214a', user_id = NULL
  WHERE id = 'f98cf734-36b9-476a-8b72-0c092041fef4';

-- Listopad 2024 - Mati (1st)
UPDATE game_players SET placeholder_player_id = '34022ad2-039a-4449-87e9-8825606e214a', user_id = NULL
  WHERE id = '5d7f2b16-4ba9-473d-a8d5-a6c966d68614';

-- Grudzien 2024 - Amir (1st)
UPDATE game_players SET placeholder_player_id = 'e0a569e1-8e37-4d7c-a195-3fec01f3d458', user_id = NULL
  WHERE id = '76628edc-d29e-4769-a5ad-5a27372f8b65';

-- Styczen 2025 - Wuzet (1st)
UPDATE game_players SET placeholder_player_id = 'ccff627b-d8a3-4ccf-8931-5da2eb476d13', user_id = NULL
  WHERE id = '8e562832-786d-4f9e-8cfa-eb3316d6016c';

-- Luty 2025 - Krystian (1st)
UPDATE game_players SET placeholder_player_id = 'af9eadaf-213d-42d8-9814-ec2c3a406f35', user_id = NULL
  WHERE id = '28be2fdf-4257-4b9b-8442-44b6fd85069c';

-- Marzec 2025 - Amir (1st)
UPDATE game_players SET placeholder_player_id = 'e0a569e1-8e37-4d7c-a195-3fec01f3d458', user_id = NULL
  WHERE id = '39e56e88-9c54-4e08-9b22-1270f4694251';

-- Kwiecien 2025 - Krystian (1st)
UPDATE game_players SET placeholder_player_id = 'af9eadaf-213d-42d8-9814-ec2c3a406f35', user_id = NULL
  WHERE id = '5a4e651e-7a81-4226-893f-95997bd97a8c';

-- Maj 2025 - Kris (1st)
UPDATE game_players SET placeholder_player_id = '1f5c9dbe-9de1-49fc-8202-2b8931ac1564', user_id = NULL
  WHERE id = '043b5720-8ef2-4f32-a34a-d7c9c5d193cb';

-- Czerwiec 2025 - Kadok (1st)
UPDATE game_players SET placeholder_player_id = 'b32f3b02-b05f-4037-925b-830a84a52395', user_id = NULL
  WHERE id = 'af365274-dd91-4648-9204-68d8764416f2';

-- Lipiec 2025 - Rafal Kuba (1st)
UPDATE game_players SET placeholder_player_id = 'e63742f2-6b37-46bc-9207-8e14771b70ca', user_id = NULL
  WHERE id = '77d031de-917a-435c-9a1a-3216fb00bdd5';

-- Sierpien 2025 - Amir (1st)
UPDATE game_players SET placeholder_player_id = 'e0a569e1-8e37-4d7c-a195-3fec01f3d458', user_id = NULL
  WHERE id = '3f9d8f86-c362-4c7d-8cb2-8edbe05cb8b1';

-- Wrzesien 2025 - Mati (1st)
UPDATE game_players SET placeholder_player_id = '34022ad2-039a-4449-87e9-8825606e214a', user_id = NULL
  WHERE id = 'b4c329c8-9f59-4d0b-9dd1-7a2205a36e68';

-- Pazdziernik 2025 - Borys (1st)
UPDATE game_players SET placeholder_player_id = 'ad8c1070-ce10-4613-9299-4436e04a267d', user_id = NULL
  WHERE id = '03448cf4-73d2-4cef-9917-eff60dec0e75';

-- Listopad 2025 - Amir (1st)
UPDATE game_players SET placeholder_player_id = 'e0a569e1-8e37-4d7c-a195-3fec01f3d458', user_id = NULL
  WHERE id = '98c13b87-c2f9-4c52-a69c-7eaf59e51f2f';

-- Grudzien 2025 - Breku (1st)
UPDATE game_players SET placeholder_player_id = 'e531e6ef-db64-4767-8536-fb627f037db3', user_id = NULL
  WHERE id = '31f7a14f-5cba-42e0-9ec4-4f21a87fa03c';

-- Now add 2nd place finishers

-- Marzec 2024 - Amir (2nd) - £112
INSERT INTO game_players (game_session_id, placeholder_player_id, display_name, finish_position, status)
VALUES ('a9b19533-11d4-4fda-a5e4-5364c39c4400', 'e0a569e1-8e37-4d7c-a195-3fec01f3d458', 'Amir', 2, 'eliminated');

-- Kwiecien 2024 - Puchar (2nd) - £127
INSERT INTO game_players (game_session_id, placeholder_player_id, display_name, finish_position, status)
VALUES ('99feefb6-3d43-417e-8e36-6617ba9e8668', '33015400-8383-48c3-b857-326fc076b7b3', 'Puchar', 2, 'eliminated');

-- Maj 2024 - Krystian (2nd) - £110
INSERT INTO game_players (game_session_id, placeholder_player_id, display_name, finish_position, status)
VALUES ('8d15c2b7-d04e-4b1b-afeb-6a3bcff8a3d0', 'af9eadaf-213d-42d8-9814-ec2c3a406f35', 'Krystian', 2, 'eliminated');

-- Czerwiec 2024 - Kuba (2nd) - £65
INSERT INTO game_players (game_session_id, placeholder_player_id, display_name, finish_position, status)
VALUES ('16461460-9b06-4982-b3bc-e680be6c974a', '885389fb-e07f-4d76-845d-aea257a90d49', 'Kuba', 2, 'eliminated');

-- Lipiec 2024 - Kadok (2nd) - £85
INSERT INTO game_players (game_session_id, placeholder_player_id, display_name, finish_position, status)
VALUES ('e988e6a3-8194-4df3-81f4-6437ac8a530f', 'b32f3b02-b05f-4037-925b-830a84a52395', 'Kadok', 2, 'eliminated');

-- Sierpien 2024 - Rafal Kuba (2nd) - £62
INSERT INTO game_players (game_session_id, placeholder_player_id, display_name, finish_position, status)
VALUES ('4a60553f-040b-4b0a-8ad9-88156b54e28a', 'e63742f2-6b37-46bc-9207-8e14771b70ca', 'Rafal Kuba', 2, 'eliminated');

-- Wrzesien 2024 - Damian (2nd) - £47
INSERT INTO game_players (game_session_id, placeholder_player_id, display_name, finish_position, status)
VALUES ('604323ce-bb13-497a-9845-ee1640c3604c', '22c855f2-d48f-4f60-9388-d905cfe613d7', 'Damian', 2, 'eliminated');

-- Pazdziernik 2024 - Kuba (2nd) - £130
INSERT INTO game_players (game_session_id, placeholder_player_id, display_name, finish_position, status)
VALUES ('ec3587ce-160c-441d-89e8-19e473f9e914', '885389fb-e07f-4d76-845d-aea257a90d49', 'Kuba', 2, 'eliminated');

-- Grudzien 2024 - Krystian (2nd) - £75
INSERT INTO game_players (game_session_id, placeholder_player_id, display_name, finish_position, status)
VALUES ('4badd1ed-b658-4b2e-9c30-b8bf51220975', 'af9eadaf-213d-42d8-9814-ec2c3a406f35', 'Krystian', 2, 'eliminated');

-- Styczen 2025 - Puchar (2nd) - £130
INSERT INTO game_players (game_session_id, placeholder_player_id, display_name, finish_position, status)
VALUES ('955a35db-7b33-4581-9bc4-52aae75f5f9c', '33015400-8383-48c3-b857-326fc076b7b3', 'Puchar', 2, 'eliminated');

-- Luty 2025 - Mati (2nd) - £200
INSERT INTO game_players (game_session_id, placeholder_player_id, display_name, finish_position, status)
VALUES ('4ec1111d-3bd5-4386-ad27-81d48a92bdd8', '34022ad2-039a-4449-87e9-8825606e214a', 'Mati', 2, 'eliminated');

-- Marzec 2025 - Kuba (2nd) - £65
INSERT INTO game_players (game_session_id, placeholder_player_id, display_name, finish_position, status)
VALUES ('a712632d-178d-4a1f-aee1-58ca6f72c58a', '885389fb-e07f-4d76-845d-aea257a90d49', 'Kuba', 2, 'eliminated');

-- Kwiecien 2025 - Amir (2nd) - £160
INSERT INTO game_players (game_session_id, placeholder_player_id, display_name, finish_position, status)
VALUES ('07dbb587-8ca6-4df7-9026-8cc03b926f62', 'e0a569e1-8e37-4d7c-a195-3fec01f3d458', 'Amir', 2, 'eliminated');

-- Maj 2025 - Mati (2nd) - £95
INSERT INTO game_players (game_session_id, placeholder_player_id, display_name, finish_position, status)
VALUES ('c7e062be-5d79-409d-bf6d-88733a27d4f8', '34022ad2-039a-4449-87e9-8825606e214a', 'Mati', 2, 'eliminated');

-- Czerwiec 2025 - Breku (2nd) - £100
INSERT INTO game_players (game_session_id, placeholder_player_id, display_name, finish_position, status)
VALUES ('d7cd5dee-a6b8-447c-a26d-60d843a31a37', 'e531e6ef-db64-4767-8536-fb627f037db3', 'Breku', 2, 'eliminated');

-- Lipiec 2025 - Breku (2nd) - £115
INSERT INTO game_players (game_session_id, placeholder_player_id, display_name, finish_position, status)
VALUES ('4dadf365-3f6a-40e5-bb64-64bd0941fc82', 'e531e6ef-db64-4767-8536-fb627f037db3', 'Breku', 2, 'eliminated');

-- Sierpien 2025 - Krystian (2nd) - £200
INSERT INTO game_players (game_session_id, placeholder_player_id, display_name, finish_position, status)
VALUES ('336b118c-52e8-473a-8c5f-6d89df5dce13', 'af9eadaf-213d-42d8-9814-ec2c3a406f35', 'Krystian', 2, 'eliminated');
