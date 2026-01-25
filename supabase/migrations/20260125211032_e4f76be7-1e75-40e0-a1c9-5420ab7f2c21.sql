-- Create enum for app-level roles
CREATE TYPE public.app_role AS ENUM ('superadmin', 'support');

-- Create app_admins table
CREATE TABLE public.app_admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  role app_role NOT NULL DEFAULT 'superadmin',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.app_admins ENABLE ROW LEVEL SECURITY;

-- Only admins can view the admins table
CREATE POLICY "App admins can view admins"
ON public.app_admins FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Helper function to check if user is app admin (SECURITY DEFINER prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.is_app_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.app_admins WHERE user_id = _user_id
  )
$$;

-- Insert ONLY amir_wanas@wp.pl as superadmin
INSERT INTO public.app_admins (user_id, role)
VALUES ('9255cdbf-e1ee-4fd0-b099-3bf8dd7a4291', 'superadmin');

-- Allow app admin to view ALL profiles
CREATE POLICY "App admin can view all profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (public.is_app_admin(auth.uid()));

-- Allow app admin to view ALL subscriptions  
CREATE POLICY "App admin can view all subscriptions"
ON public.subscriptions FOR SELECT
TO authenticated
USING (public.is_app_admin(auth.uid()));

-- Allow app admin to INSERT subscriptions for any user
CREATE POLICY "App admin can insert subscriptions"
ON public.subscriptions FOR INSERT
TO authenticated
WITH CHECK (public.is_app_admin(auth.uid()));

-- Allow app admin to UPDATE any subscription
CREATE POLICY "App admin can update all subscriptions"
ON public.subscriptions FOR UPDATE
TO authenticated
USING (public.is_app_admin(auth.uid()))
WITH CHECK (public.is_app_admin(auth.uid()));

-- Allow app admin to DELETE any subscription
CREATE POLICY "App admin can delete subscriptions"
ON public.subscriptions FOR DELETE
TO authenticated
USING (public.is_app_admin(auth.uid()));