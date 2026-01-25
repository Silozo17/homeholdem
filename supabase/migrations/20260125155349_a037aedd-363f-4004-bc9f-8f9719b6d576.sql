-- Create notifications table for in-app notifications
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  type TEXT NOT NULL, -- 'rsvp', 'date_finalized', 'waitlist_promotion', 'chat_message', 'host_confirmed', 'event_created'
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  url TEXT, -- Deep link to relevant page
  read_at TIMESTAMPTZ, -- NULL = unread
  created_at TIMESTAMPTZ DEFAULT now(),
  
  -- Optional context for rich rendering
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
  club_id UUID REFERENCES public.clubs(id) ON DELETE CASCADE,
  sender_id UUID -- Who triggered the notification
);

-- Index for fast queries
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_unread ON public.notifications(user_id) WHERE read_at IS NULL;
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at DESC);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can only see their own notifications
CREATE POLICY "Users can view own notifications" ON public.notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications" ON public.notifications
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own notifications" ON public.notifications
  FOR DELETE USING (auth.uid() = user_id);

-- Anyone can insert (for triggers/edge functions)
CREATE POLICY "Allow insert notifications" ON public.notifications
  FOR INSERT WITH CHECK (true);

-- Enable realtime for instant updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;