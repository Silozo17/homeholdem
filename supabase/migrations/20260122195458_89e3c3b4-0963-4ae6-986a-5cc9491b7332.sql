-- Create chat_messages table for club and event chat
CREATE TABLE public.chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Policies for chat messages
CREATE POLICY "Club members can view chat messages"
ON public.chat_messages FOR SELECT
USING (is_club_member(auth.uid(), club_id));

CREATE POLICY "Club members can send chat messages"
ON public.chat_messages FOR INSERT
WITH CHECK (auth.uid() = user_id AND is_club_member(auth.uid(), club_id));

CREATE POLICY "Users can delete their own messages"
ON public.chat_messages FOR DELETE
USING (auth.uid() = user_id);

-- Enable realtime for chat
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;

-- Create club_rules table for house rules
CREATE TABLE public.club_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for club_rules
ALTER TABLE public.club_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Club members can view rules"
ON public.club_rules FOR SELECT
USING (is_club_member(auth.uid(), club_id));

CREATE POLICY "Club admins can create rules"
ON public.club_rules FOR INSERT
WITH CHECK (is_club_admin_or_owner(auth.uid(), club_id));

CREATE POLICY "Club admins can update rules"
ON public.club_rules FOR UPDATE
USING (is_club_admin_or_owner(auth.uid(), club_id));

CREATE POLICY "Club admins can delete rules"
ON public.club_rules FOR DELETE
USING (is_club_admin_or_owner(auth.uid(), club_id));

-- Trigger for updated_at on club_rules
CREATE TRIGGER update_club_rules_updated_at
BEFORE UPDATE ON public.club_rules
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create audit_logs table for tracking transaction edits
CREATE TABLE public.audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  action TEXT NOT NULL,
  old_values JSONB,
  new_values JSONB,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for audit_logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Only admins of the related club can view audit logs
CREATE POLICY "Club admins can view audit logs"
ON public.audit_logs FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.game_transactions gt
    WHERE gt.id = audit_logs.record_id
    AND is_game_session_club_admin(auth.uid(), gt.game_session_id)
  )
);

-- Create trigger function to log transaction changes
CREATE OR REPLACE FUNCTION public.log_transaction_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    INSERT INTO public.audit_logs (table_name, record_id, action, old_values, new_values, user_id)
    VALUES (
      TG_TABLE_NAME,
      OLD.id,
      'UPDATE',
      to_jsonb(OLD),
      to_jsonb(NEW),
      auth.uid()
    );
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_logs (table_name, record_id, action, old_values, new_values, user_id)
    VALUES (
      TG_TABLE_NAME,
      OLD.id,
      'DELETE',
      to_jsonb(OLD),
      NULL,
      auth.uid()
    );
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- Create trigger on game_transactions
CREATE TRIGGER audit_game_transactions
AFTER UPDATE OR DELETE ON public.game_transactions
FOR EACH ROW
EXECUTE FUNCTION public.log_transaction_changes();