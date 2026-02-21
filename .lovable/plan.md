

# Backfill Achievement XP for All Players

## Current State

Achievements are already MP-only -- `useAchievements` / `checkAndAward` is only called in `OnlinePokerTable.tsx`. The bot game (`PlayPoker.tsx` / `PokerTablePro`) does NOT use achievements at all. So no code change needed there.

The real problem: the XP bonus code (`ACHIEVEMENT_XP` insert into `xp_events`) was added recently, AFTER many players had already unlocked achievements. Those players have achievements in localStorage but zero corresponding `xp_events` rows.

## Fix

### 1. Add XP backfill on Profile page load

In `Profile.tsx`, after loading the unlocked achievement IDs from localStorage, query `xp_events` for any existing `achievement:*` rows for this user. For any unlocked achievement missing its XP row, insert the missing XP events.

This is a self-healing one-time sync that runs each time the user visits their Profile. It uses a component-level ref to avoid duplicate inserts within the same page session.

### 2. Add XP backfill on MP table join

In `OnlinePokerTable.tsx`, add the same one-time sync on mount (guarded by a ref). This catches players who play MP but never visit Profile.

### Implementation Detail

```
// Pseudocode for both files:
useEffect(() => {
  if (!user) return;
  const unlocked = parse localStorage 'poker-achievements' -> unlocked[]
  if (unlocked.length === 0) return;

  supabase.from('xp_events')
    .select('reason')
    .eq('user_id', user.id)
    .like('reason', 'achievement:%')
    .then(({ data }) => {
      const existing = new Set(data.map(r => r.reason));
      const missing = unlocked.filter(id =>
        ACHIEVEMENT_XP[id] > 0 && !existing.has('achievement:' + id)
      );
      if (missing.length === 0) return;
      supabase.from('xp_events').insert(
        missing.map(id => ({
          user_id: user.id,
          xp_amount: ACHIEVEMENT_XP[id],
          reason: 'achievement:' + id,
        }))
      );
    });
}, [user?.id]);
```

## Files Modified

| File | Change |
|------|--------|
| `src/pages/Profile.tsx` | Add achievement XP backfill on page load |
| `src/components/poker/OnlinePokerTable.tsx` | Add achievement XP backfill on table mount |

## What Does NOT Change

- No changes to bot game code (already doesn't use achievements)
- No database schema changes
- No edge function changes
- No navigation, layout, or bottom nav changes
- Achievement localStorage storage format unchanged

