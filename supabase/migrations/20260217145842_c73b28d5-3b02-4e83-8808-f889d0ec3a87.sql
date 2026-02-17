CREATE POLICY "Users can insert own xp_events"
  ON public.xp_events FOR INSERT
  WITH CHECK (user_id = auth.uid());