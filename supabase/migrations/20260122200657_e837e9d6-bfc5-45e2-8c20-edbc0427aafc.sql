-- Create settlements table to track payments between players
CREATE TABLE public.settlements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  game_session_id UUID REFERENCES public.game_sessions(id) ON DELETE SET NULL,
  from_user_id UUID NOT NULL,
  to_user_id UUID NOT NULL,
  amount INTEGER NOT NULL,
  is_settled BOOLEAN NOT NULL DEFAULT false,
  settled_at TIMESTAMP WITH TIME ZONE,
  settled_by UUID,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.settlements ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Club members can view settlements"
ON public.settlements
FOR SELECT
USING (is_club_member(auth.uid(), club_id));

CREATE POLICY "Club admins can create settlements"
ON public.settlements
FOR INSERT
WITH CHECK (is_club_admin_or_owner(auth.uid(), club_id));

CREATE POLICY "Club admins can update settlements"
ON public.settlements
FOR UPDATE
USING (is_club_admin_or_owner(auth.uid(), club_id));

CREATE POLICY "Club admins can delete settlements"
ON public.settlements
FOR DELETE
USING (is_club_admin_or_owner(auth.uid(), club_id));

-- Add trigger for updated_at
CREATE TRIGGER update_settlements_updated_at
BEFORE UPDATE ON public.settlements
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();