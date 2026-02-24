DROP POLICY "Users can create club notifications" ON public.notifications;

CREATE POLICY "Users can create notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (
    sender_id = auth.uid()
    AND (
      (
        (club_id IS NOT NULL OR event_id IS NOT NULL)
        AND (club_id IS NULL OR (is_club_member(auth.uid(), club_id) AND is_club_member(user_id, club_id)))
        AND (event_id IS NULL OR (is_event_club_member(auth.uid(), event_id) AND is_event_club_member(user_id, event_id)))
      )
      OR (club_id IS NULL AND event_id IS NULL)
    )
  );