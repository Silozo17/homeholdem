-- Create pending_notifications table for delayed notifications (3-minute delay)
CREATE TABLE public.pending_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
  
  -- Notification content
  type TEXT NOT NULL, -- 'rsvp', 'vote', 'dropout', 'waitlist_promotion'
  action TEXT NOT NULL, -- 'going', 'maybe', 'not_going', 'voted', 'waitlist_to_going'
  actor_id UUID NOT NULL,
  actor_name TEXT NOT NULL,
  
  -- Scheduling
  scheduled_for TIMESTAMPTZ NOT NULL, -- When to send (created_at + 3 minutes)
  superseded_by UUID REFERENCES public.pending_notifications(id) ON DELETE SET NULL,
  is_processed BOOLEAN NOT NULL DEFAULT FALSE,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for efficient querying
CREATE INDEX idx_pending_notifications_scheduled 
  ON pending_notifications(scheduled_for) 
  WHERE is_processed = FALSE;

CREATE INDEX idx_pending_notifications_actor 
  ON pending_notifications(actor_id, event_id, type);

-- Enable RLS (service role only)
ALTER TABLE public.pending_notifications ENABLE ROW LEVEL SECURITY;

-- No policies = service role only can access
-- (RLS is enabled but no policies = deny all for normal users)

-- Add new push notification preference columns
ALTER TABLE public.user_preferences
ADD COLUMN IF NOT EXISTS push_game_completed BOOLEAN NOT NULL DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS push_event_unlocked BOOLEAN NOT NULL DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS push_member_rsvp BOOLEAN NOT NULL DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS push_member_vote BOOLEAN NOT NULL DEFAULT TRUE;

-- Comments for documentation
COMMENT ON TABLE public.pending_notifications IS 'Queue for delayed notifications (3-minute delay to prevent spam)';
COMMENT ON COLUMN user_preferences.push_game_completed IS 'Notify when a game is finalized with winners';
COMMENT ON COLUMN user_preferences.push_event_unlocked IS 'Notify when an event is unlocked for voting';
COMMENT ON COLUMN user_preferences.push_member_rsvp IS 'Notify when club members RSVP to events';
COMMENT ON COLUMN user_preferences.push_member_vote IS 'Notify when club members vote on dates';