-- Create banned_users table for tracking banned/suspended users
CREATE TABLE public.banned_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  banned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  banned_by UUID,
  reason TEXT,
  type TEXT NOT NULL DEFAULT 'ban' CHECK (type IN ('ban', 'suspend')),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.banned_users ENABLE ROW LEVEL SECURITY;

-- Only app admins can manage bans
CREATE POLICY "App admins can view bans"
ON public.banned_users
FOR SELECT
TO authenticated
USING (public.is_app_admin(auth.uid()));

CREATE POLICY "App admins can insert bans"
ON public.banned_users
FOR INSERT
TO authenticated
WITH CHECK (public.is_app_admin(auth.uid()));

CREATE POLICY "App admins can update bans"
ON public.banned_users
FOR UPDATE
TO authenticated
USING (public.is_app_admin(auth.uid()))
WITH CHECK (public.is_app_admin(auth.uid()));

CREATE POLICY "App admins can delete bans"
ON public.banned_users
FOR DELETE
TO authenticated
USING (public.is_app_admin(auth.uid()));

-- Create helper function to check if user is banned
CREATE OR REPLACE FUNCTION public.is_user_banned(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.banned_users
    WHERE user_id = _user_id
      AND (expires_at IS NULL OR expires_at > now())
  )
$$;