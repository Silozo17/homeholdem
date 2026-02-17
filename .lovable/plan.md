

# Fix: Admin Display Name Change Not Persisting

## Root Cause

The `profiles` table has only one UPDATE RLS policy: **"Users can update their own profile"** which checks `auth.uid() = id`. When an admin updates another user's profile, RLS silently blocks the write (0 rows affected, no SQL error). The UI shows a success toast because the Supabase client doesn't throw an error for 0 affected rows.

## Fix

Add a new RLS policy on the `profiles` table that allows app admins to update any profile:

```sql
CREATE POLICY "App admins can update all profiles"
  ON public.profiles
  FOR UPDATE
  USING (is_app_admin(auth.uid()))
  WITH CHECK (is_app_admin(auth.uid()));
```

This is a single database migration. No code changes needed -- the existing `handleSaveDisplayName` function in `UserDetailSheet.tsx` already works correctly, it just needs the RLS policy to allow the write through.

## Files Changed

| File | Change |
|------|--------|
| Database migration only | Add UPDATE policy for app admins on `profiles` table |

## What Does NOT Change

- No UI, layout, navigation, or style changes
- No changes to BottomNav
- No code file modifications
- No refactoring or renaming

