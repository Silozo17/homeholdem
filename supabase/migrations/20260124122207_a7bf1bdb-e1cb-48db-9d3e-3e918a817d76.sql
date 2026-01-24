-- Create subscriptions table for managing user subscriptions
CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'trialing' CHECK (status IN ('trialing', 'active', 'expired', 'canceled')),
  plan TEXT NOT NULL DEFAULT 'monthly' CHECK (plan IN ('monthly', 'annual')),
  trial_ends_at TIMESTAMP WITH TIME ZONE,
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can view their own subscription
CREATE POLICY "Users can view own subscription"
ON public.subscriptions
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own subscription (for initial creation)
CREATE POLICY "Users can insert own subscription"
ON public.subscriptions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own subscription
CREATE POLICY "Users can update own subscription"
ON public.subscriptions
FOR UPDATE
USING (auth.uid() = user_id);

-- Create function to check if user has active subscription
CREATE OR REPLACE FUNCTION public.has_active_subscription(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.subscriptions
    WHERE user_id = _user_id
      AND (
        (status = 'trialing' AND trial_ends_at > now())
        OR (status = 'active' AND current_period_end > now())
      )
  )
$$;

-- Create trigger for updated_at
CREATE TRIGGER update_subscriptions_updated_at
BEFORE UPDATE ON public.subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();