-- Create user_preferences table for notification and privacy settings
CREATE TABLE public.user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  
  -- Email notification preferences
  email_event_created BOOLEAN DEFAULT true,
  email_event_reminder BOOLEAN DEFAULT true,
  email_rsvp_confirmation BOOLEAN DEFAULT true,
  email_waitlist_promotion BOOLEAN DEFAULT true,
  email_game_results BOOLEAN DEFAULT true,
  email_club_invites BOOLEAN DEFAULT true,
  
  -- Push notification preferences
  push_rsvp_updates BOOLEAN DEFAULT true,
  push_date_finalized BOOLEAN DEFAULT true,
  push_waitlist_promotion BOOLEAN DEFAULT true,
  push_chat_messages BOOLEAN DEFAULT true,
  push_blinds_up BOOLEAN DEFAULT true,
  
  -- Other preferences
  show_stats_publicly BOOLEAN DEFAULT true,
  
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

-- Users can only view their own preferences
CREATE POLICY "Users can view own preferences"
  ON public.user_preferences FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own preferences"
  ON public.user_preferences FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own preferences"
  ON public.user_preferences FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Trigger for updated_at
CREATE TRIGGER update_user_preferences_updated_at
  BEFORE UPDATE ON public.user_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create preferences for new users
CREATE OR REPLACE FUNCTION public.create_user_preferences()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created_preferences
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.create_user_preferences();