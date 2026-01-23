-- Add language column to user_preferences table
ALTER TABLE public.user_preferences 
ADD COLUMN language TEXT DEFAULT 'en';

-- Add comment for documentation
COMMENT ON COLUMN public.user_preferences.language IS 'User preferred language code (en, pl)';