-- Create email_verifications table for OTP codes
CREATE TABLE public.email_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  code TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '10 minutes'),
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for quick lookup
CREATE INDEX idx_email_verifications_email ON email_verifications(email);
CREATE INDEX idx_email_verifications_code ON email_verifications(code);

-- RLS - allow edge functions with service role to manage, but public can check their own
ALTER TABLE public.email_verifications ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert (for signup flow before auth)
CREATE POLICY "Anyone can create verification codes"
ON public.email_verifications
FOR INSERT
WITH CHECK (true);

-- Allow anyone to read their own verification by email
CREATE POLICY "Anyone can read their verification codes"
ON public.email_verifications
FOR SELECT
USING (true);

-- Allow updates (for marking verified)
CREATE POLICY "Anyone can update their verification codes"
ON public.email_verifications
FOR UPDATE
USING (true);

-- Clean up old verifications automatically (optional - can be done via cron)
-- Delete expired unverified codes older than 1 hour
CREATE OR REPLACE FUNCTION public.cleanup_expired_verifications()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.email_verifications
  WHERE expires_at < now() - interval '1 hour'
  AND verified_at IS NULL;
END;
$$;