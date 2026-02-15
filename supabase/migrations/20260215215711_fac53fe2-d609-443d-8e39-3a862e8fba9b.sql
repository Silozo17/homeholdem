
-- Fix: recreate view as SECURITY INVOKER (default, safe)
DROP VIEW IF EXISTS public.poker_hands_public;

CREATE VIEW public.poker_hands_public
WITH (security_invoker = true)
AS
SELECT id, table_id, hand_number, dealer_seat, sb_seat, bb_seat,
       phase, community_cards, pots, current_actor_seat,
       current_bet, min_raise, action_deadline,
       deck_seed_commitment,
       CASE WHEN completed_at IS NOT NULL THEN deck_seed_revealed ELSE NULL END as deck_seed_revealed,
       started_at, completed_at, results, state_version
FROM public.poker_hands;
