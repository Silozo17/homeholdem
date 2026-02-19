-- Add new push notification preference columns for friend requests, DMs, and new members
ALTER TABLE public.user_preferences 
ADD COLUMN IF NOT EXISTS push_friend_requests BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS push_direct_messages BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS push_new_member BOOLEAN NOT NULL DEFAULT true;