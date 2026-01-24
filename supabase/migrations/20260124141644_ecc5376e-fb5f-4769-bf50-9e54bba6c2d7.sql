-- Grant all existing users 12 months free access from today
INSERT INTO public.subscriptions (
  user_id,
  status,
  plan,
  current_period_start,
  current_period_end,
  trial_ends_at,
  stripe_customer_id,
  stripe_subscription_id
)
SELECT 
  id as user_id,
  'active' as status,
  'annual' as plan,
  now() as current_period_start,
  now() + interval '12 months' as current_period_end,
  NULL as trial_ends_at,
  NULL as stripe_customer_id,
  NULL as stripe_subscription_id
FROM auth.users
WHERE id NOT IN (SELECT user_id FROM public.subscriptions);