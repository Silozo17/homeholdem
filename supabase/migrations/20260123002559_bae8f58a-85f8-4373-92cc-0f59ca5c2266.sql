-- Create event_host_votes table for voting on host volunteers
CREATE TABLE public.event_host_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  voter_user_id UUID NOT NULL,
  volunteer_user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(event_id, voter_user_id) -- Each user can only vote once per event
);

-- Enable RLS
ALTER TABLE public.event_host_votes ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Club members can view host votes"
  ON public.event_host_votes FOR SELECT TO authenticated
  USING (public.is_event_club_member(auth.uid(), event_id));

CREATE POLICY "Club members can vote for hosts"
  ON public.event_host_votes FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = voter_user_id AND 
    auth.uid() != volunteer_user_id AND
    public.is_event_club_member(auth.uid(), event_id)
  );

CREATE POLICY "Users can remove their vote"
  ON public.event_host_votes FOR DELETE TO authenticated
  USING (auth.uid() = voter_user_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE event_host_votes;