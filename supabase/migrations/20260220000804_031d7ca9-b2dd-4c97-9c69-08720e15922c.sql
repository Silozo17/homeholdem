
-- Add tutorial_completed_at column to profiles
ALTER TABLE public.profiles ADD COLUMN tutorial_completed_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Mark all existing users as completed EXCEPT Kamil and Timmy
UPDATE public.profiles 
SET tutorial_completed_at = now()
WHERE id NOT IN (
  'e5162f27-b90a-48c5-a8f5-b6e22d77fa36',
  '9db2b9e1-640e-49cc-b77b-4f3cd379323d'
);

-- Grant 1600 XP to all users who completed (except Kamil and Timmy)
INSERT INTO public.xp_events (user_id, xp_amount, reason)
SELECT id, 1600, 'tutorial_complete'
FROM public.profiles
WHERE tutorial_completed_at IS NOT NULL
  AND id NOT IN (
    'e5162f27-b90a-48c5-a8f5-b6e22d77fa36',
    '9db2b9e1-640e-49cc-b77b-4f3cd379323d'
  );
