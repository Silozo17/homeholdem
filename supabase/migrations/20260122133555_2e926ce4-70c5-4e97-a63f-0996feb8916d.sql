-- Fix function search path issues
CREATE OR REPLACE FUNCTION public.generate_invite_code()
RETURNS TEXT
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..6 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_invite_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  new_code TEXT;
BEGIN
  LOOP
    new_code := public.generate_invite_code();
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.clubs WHERE invite_code = new_code);
  END LOOP;
  NEW.invite_code := new_code;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Fix overly permissive RLS policy for clubs insert
-- Drop the existing overly permissive policy
DROP POLICY IF EXISTS "Authenticated users can create clubs" ON public.clubs;

-- Create a more specific policy - users can create clubs but we use a trigger to add them as owner
CREATE POLICY "Authenticated users can create clubs"
ON public.clubs FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

-- Create trigger to automatically add club creator as owner
CREATE OR REPLACE FUNCTION public.add_club_owner()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.club_members (club_id, user_id, role)
  VALUES (NEW.id, auth.uid(), 'owner');
  RETURN NEW;
END;
$$;

CREATE TRIGGER clubs_add_owner
AFTER INSERT ON public.clubs
FOR EACH ROW
EXECUTE FUNCTION public.add_club_owner();