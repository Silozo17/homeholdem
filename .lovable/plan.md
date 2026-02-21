

# Fix: Achievement XP Backfill Not Triggering

## Root Cause

The backfill code only runs on the **Profile page** and **MP table mount**. The user hasn't visited either of those pages since the code was deployed. They land on `/` which redirects to `/dashboard` -- where no backfill exists.

Confirmed: the `xp_events` table has **zero** rows with `reason LIKE 'achievement:%'`.

## Fix

Add the same one-time achievement XP backfill to `Dashboard.tsx` -- the page every logged-in user sees first. Also add `console.log` to help debug if it still doesn't work.

### File: `src/pages/Dashboard.tsx`

- Import `useRef` from React
- Import `ACHIEVEMENT_XP` from `@/lib/poker/achievements`
- Import `supabase` (already imported)
- Add a `useEffect` with a ref guard that:
  1. Reads `poker-achievements` from localStorage
  2. Queries `xp_events` for existing `achievement:*` rows
  3. Inserts missing XP records
  4. Logs results for debugging

```text
Code change (pseudocode):

useEffect(() => {
  if (!user || syncedRef.current) return;
  syncedRef.current = true;

  const raw = localStorage.getItem('poker-achievements');
  if (!raw) return;
  const { unlocked } = JSON.parse(raw);
  if (!unlocked?.length) return;

  supabase.from('xp_events')
    .select('reason')
    .eq('user_id', user.id)
    .like('reason', 'achievement:%')
    .then(({ data, error }) => {
      if (error) { console.error('XP backfill query error', error); return; }
      const existing = new Set(data.map(r => r.reason));
      const missing = unlocked.filter(id =>
        ACHIEVEMENT_XP[id] > 0 && !existing.has(`achievement:${id}`)
      );
      if (missing.length === 0) return;
      supabase.from('xp_events').insert(
        missing.map(id => ({
          user_id: user.id,
          xp_amount: ACHIEVEMENT_XP[id],
          reason: `achievement:${id}`,
        }))
      ).then(({ error: insertErr }) => {
        if (insertErr) console.error('XP backfill insert error', insertErr);
        else console.log('Backfilled XP for', missing.length, 'achievements');
      });
    });
}, [user?.id]);
```

### Also: Add error logging to existing backfills

In both `Profile.tsx` and `OnlinePokerTable.tsx`, the existing backfill code has no error handling on the insert -- errors are silently swallowed. Add `.then(({ error }) => { if (error) console.error(...) })` to the insert calls so we can diagnose failures.

## Files Modified

| File | Change |
|------|--------|
| `src/pages/Dashboard.tsx` | Add achievement XP backfill on page load |
| `src/pages/Profile.tsx` | Add error logging to existing backfill insert |
| `src/components/poker/OnlinePokerTable.tsx` | Add error logging to existing backfill insert |

## What Does NOT Change

- No database schema changes
- No navigation, layout, or bottom nav changes
- No edge function changes
- Existing backfill logic in Profile and OnlinePokerTable stays
