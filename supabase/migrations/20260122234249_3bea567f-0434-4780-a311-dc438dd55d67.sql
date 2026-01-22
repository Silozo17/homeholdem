-- 1. Create secure RPC for invite code lookup (replaces open policy)
CREATE OR REPLACE FUNCTION public.lookup_club_by_invite_code(_invite_code text)
RETURNS TABLE (
  id uuid,
  name text
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.id, c.name
  FROM clubs c
  WHERE c.invite_code = upper(_invite_code)
  LIMIT 1
$$;

-- 2. Create secure RPC to get club member profiles (with email for club context)
CREATE OR REPLACE FUNCTION public.get_club_member_profiles(_club_id uuid)
RETURNS TABLE (
  id uuid,
  display_name text,
  avatar_url text,
  email text
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.display_name, p.avatar_url, p.email
  FROM profiles p
  JOIN club_members cm ON cm.user_id = p.id
  WHERE cm.club_id = _club_id
  AND is_club_member(auth.uid(), _club_id)
$$;

-- 3. Remove overly permissive clubs policy
DROP POLICY IF EXISTS "Anyone can view club by invite code" ON public.clubs;

-- 4. Update profiles SELECT policy - users can only view their own profile directly
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

CREATE POLICY "Users can view own profile"
ON public.profiles FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- 5. Add policy for club members to view each other's profiles (needed for member lists, chat, etc.)
CREATE POLICY "Club members can view fellow members profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM club_members cm1
    JOIN club_members cm2 ON cm1.club_id = cm2.club_id
    WHERE cm1.user_id = auth.uid()
    AND cm2.user_id = profiles.id
  )
);