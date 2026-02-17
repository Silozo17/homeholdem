CREATE POLICY "App admins can update all profiles"
  ON public.profiles
  FOR UPDATE
  USING (is_app_admin(auth.uid()))
  WITH CHECK (is_app_admin(auth.uid()));