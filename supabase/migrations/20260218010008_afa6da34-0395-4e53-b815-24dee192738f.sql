
-- 1. Create security definer function to break the circular RLS dependency
CREATE OR REPLACE FUNCTION public.is_seated_at_table(_user_id uuid, _table_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM poker_seats
    WHERE table_id = _table_id AND player_id = _user_id
  )
$$;

-- 2. Drop the old policy that causes infinite recursion
DROP POLICY IF EXISTS "Users can view relevant tables" ON poker_tables;

-- 3. Recreate using the helper function instead of direct poker_seats subquery
CREATE POLICY "Users can view relevant tables" ON poker_tables
  FOR SELECT USING (
    table_type IN ('public', 'community')
    OR created_by = auth.uid()
    OR (table_type = 'friends' AND is_seated_at_table(auth.uid(), id))
    OR (table_type = 'private' AND is_seated_at_table(auth.uid(), id))
    OR (table_type = 'club' AND club_id IS NOT NULL AND is_club_member(auth.uid(), club_id))
  );
