-- Fix linter: RLS enabled but no policies on pending_notifications
ALTER TABLE public.pending_notifications ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  -- SELECT: users can only see notifications they queued
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='pending_notifications'
      AND policyname='Users can view their queued notifications'
  ) THEN
    CREATE POLICY "Users can view their queued notifications"
    ON public.pending_notifications
    FOR SELECT
    TO authenticated
    USING (actor_id = auth.uid());
  END IF;

  -- INSERT: users can only queue notifications as themselves, and only for clubs/events they belong to
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='pending_notifications'
      AND policyname='Users can queue their own notifications'
  ) THEN
    CREATE POLICY "Users can queue their own notifications"
    ON public.pending_notifications
    FOR INSERT
    TO authenticated
    WITH CHECK (
      actor_id = auth.uid()
      AND is_club_member(auth.uid(), club_id)
      AND (event_id IS NULL OR is_event_club_member(auth.uid(), event_id))
    );
  END IF;
END $$;

-- Fix linter: overly-permissive insert policy on notifications
DROP POLICY IF EXISTS "Allow insert notifications" ON public.notifications;

DO $$
BEGIN
  -- Keep existing per-user read/update/delete behavior but restrict to authenticated (not public)
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='notifications'
      AND policyname='Users can view own notifications'
  ) THEN
    DROP POLICY "Users can view own notifications" ON public.notifications;
  END IF;

  CREATE POLICY "Users can view own notifications"
  ON public.notifications
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='notifications'
      AND policyname='Users can update own notifications'
  ) THEN
    DROP POLICY "Users can update own notifications" ON public.notifications;
  END IF;

  CREATE POLICY "Users can update own notifications"
  ON public.notifications
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='notifications'
      AND policyname='Users can delete own notifications'
  ) THEN
    DROP POLICY "Users can delete own notifications" ON public.notifications;
  END IF;

  CREATE POLICY "Users can delete own notifications"
  ON public.notifications
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

  -- New INSERT policy: authenticated users can notify other club/event members, but only within the same club/event and with sender_id = auth.uid()
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='notifications'
      AND policyname='Users can create club notifications'
  ) THEN
    CREATE POLICY "Users can create club notifications"
    ON public.notifications
    FOR INSERT
    TO authenticated
    WITH CHECK (
      sender_id = auth.uid()
      AND (club_id IS NOT NULL OR event_id IS NOT NULL)
      AND (club_id IS NULL OR (is_club_member(auth.uid(), club_id) AND is_club_member(user_id, club_id)))
      AND (event_id IS NULL OR (is_event_club_member(auth.uid(), event_id) AND is_event_club_member(user_id, event_id)))
    );
  END IF;
END $$;

-- Fix linter: overly-permissive public insert policy on email_verifications (OTP)
DROP POLICY IF EXISTS "Allow anonymous insert for OTP requests" ON public.email_verifications;

-- Keep RLS enabled but deny direct client reads (edge/back-end uses service role and bypasses RLS)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='email_verifications'
      AND policyname='No direct client access'
  ) THEN
    CREATE POLICY "No direct client access"
    ON public.email_verifications
    FOR SELECT
    TO authenticated
    USING (false);
  END IF;
END $$;