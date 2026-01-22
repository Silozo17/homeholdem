-- Security Fix: Remove overly permissive email verification policies
-- The verification now happens only via Edge Function with service role key
DROP POLICY IF EXISTS "Anyone can read their verification codes" ON email_verifications;
DROP POLICY IF EXISTS "Anyone can update their verification codes" ON email_verifications;
DROP POLICY IF EXISTS "Anyone can create verification codes" ON email_verifications;

-- New policies: Only allow operations that match the email being verified (via service role in edge function)
-- Since the edge function uses service_role, we don't need client-side policies for read/update
-- But we need to allow inserts for the initial OTP request
CREATE POLICY "Allow anonymous insert for OTP requests"
ON email_verifications FOR INSERT
WITH CHECK (true);

-- Enable Realtime for live updates without manual refresh (skip game_sessions which is already added)
ALTER PUBLICATION supabase_realtime ADD TABLE event_date_votes;
ALTER PUBLICATION supabase_realtime ADD TABLE event_rsvps;
ALTER PUBLICATION supabase_realtime ADD TABLE event_host_volunteers;
ALTER PUBLICATION supabase_realtime ADD TABLE game_players;
ALTER PUBLICATION supabase_realtime ADD TABLE game_transactions;