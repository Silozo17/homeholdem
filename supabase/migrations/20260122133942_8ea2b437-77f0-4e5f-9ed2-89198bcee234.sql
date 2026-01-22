-- Create enum for RSVP status
CREATE TYPE public.rsvp_status AS ENUM ('going', 'maybe', 'not_going');

-- Create events table
CREATE TABLE public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  location TEXT,
  max_tables INTEGER NOT NULL DEFAULT 1 CHECK (max_tables >= 1 AND max_tables <= 2),
  seats_per_table INTEGER NOT NULL DEFAULT 10 CHECK (seats_per_table >= 2 AND seats_per_table <= 12),
  final_date TIMESTAMP WITH TIME ZONE,
  host_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  is_finalized BOOLEAN NOT NULL DEFAULT false,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create date options for polling
CREATE TABLE public.event_date_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  proposed_date TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create votes for date options
CREATE TABLE public.event_date_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date_option_id UUID NOT NULL REFERENCES public.event_date_options(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(date_option_id, user_id)
);

-- Create RSVPs
CREATE TABLE public.event_rsvps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status public.rsvp_status NOT NULL DEFAULT 'maybe',
  is_waitlisted BOOLEAN NOT NULL DEFAULT false,
  waitlist_position INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(event_id, user_id)
);

-- Create host volunteers
CREATE TABLE public.event_host_volunteers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(event_id, user_id)
);

-- Enable RLS
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_date_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_date_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_rsvps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_host_volunteers ENABLE ROW LEVEL SECURITY;

-- Helper function to check if user is member of event's club
CREATE OR REPLACE FUNCTION public.is_event_club_member(_user_id UUID, _event_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.events e
    JOIN public.club_members cm ON cm.club_id = e.club_id
    WHERE e.id = _event_id AND cm.user_id = _user_id
  )
$$;

-- Helper function to check if user is admin/owner of event's club
CREATE OR REPLACE FUNCTION public.is_event_club_admin(_user_id UUID, _event_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.events e
    JOIN public.club_members cm ON cm.club_id = e.club_id
    WHERE e.id = _event_id 
      AND cm.user_id = _user_id 
      AND cm.role IN ('owner', 'admin')
  )
$$;

-- Events policies
CREATE POLICY "Club members can view events"
ON public.events FOR SELECT
TO authenticated
USING (public.is_club_member(auth.uid(), club_id));

CREATE POLICY "Club admins can create events"
ON public.events FOR INSERT
TO authenticated
WITH CHECK (public.is_club_admin_or_owner(auth.uid(), club_id) AND auth.uid() = created_by);

CREATE POLICY "Club admins can update events"
ON public.events FOR UPDATE
TO authenticated
USING (public.is_club_admin_or_owner(auth.uid(), club_id))
WITH CHECK (public.is_club_admin_or_owner(auth.uid(), club_id));

CREATE POLICY "Club admins can delete events"
ON public.events FOR DELETE
TO authenticated
USING (public.is_club_admin_or_owner(auth.uid(), club_id));

-- Date options policies
CREATE POLICY "Club members can view date options"
ON public.event_date_options FOR SELECT
TO authenticated
USING (public.is_event_club_member(auth.uid(), event_id));

CREATE POLICY "Club admins can manage date options"
ON public.event_date_options FOR INSERT
TO authenticated
WITH CHECK (public.is_event_club_admin(auth.uid(), event_id));

CREATE POLICY "Club admins can delete date options"
ON public.event_date_options FOR DELETE
TO authenticated
USING (public.is_event_club_admin(auth.uid(), event_id));

-- Date votes policies
CREATE POLICY "Club members can view votes"
ON public.event_date_votes FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.event_date_options edo
  WHERE edo.id = date_option_id
  AND public.is_event_club_member(auth.uid(), edo.event_id)
));

CREATE POLICY "Club members can vote"
ON public.event_date_votes FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (
    SELECT 1 FROM public.event_date_options edo
    WHERE edo.id = date_option_id
    AND public.is_event_club_member(auth.uid(), edo.event_id)
  )
);

CREATE POLICY "Users can remove their vote"
ON public.event_date_votes FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- RSVPs policies
CREATE POLICY "Club members can view RSVPs"
ON public.event_rsvps FOR SELECT
TO authenticated
USING (public.is_event_club_member(auth.uid(), event_id));

CREATE POLICY "Club members can RSVP"
ON public.event_rsvps FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id AND public.is_event_club_member(auth.uid(), event_id));

CREATE POLICY "Users can update their RSVP"
ON public.event_rsvps FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their RSVP"
ON public.event_rsvps FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Host volunteers policies
CREATE POLICY "Club members can view host volunteers"
ON public.event_host_volunteers FOR SELECT
TO authenticated
USING (public.is_event_club_member(auth.uid(), event_id));

CREATE POLICY "Club members can volunteer to host"
ON public.event_host_volunteers FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id AND public.is_event_club_member(auth.uid(), event_id));

CREATE POLICY "Users can remove host volunteer"
ON public.event_host_volunteers FOR DELETE
TO authenticated
USING (auth.uid() = user_id OR public.is_event_club_admin(auth.uid(), event_id));

-- Update triggers
CREATE TRIGGER update_events_updated_at
BEFORE UPDATE ON public.events
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_event_rsvps_updated_at
BEFORE UPDATE ON public.event_rsvps
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();