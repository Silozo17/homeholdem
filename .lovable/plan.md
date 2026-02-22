

# Plan: Fix Dashboard Stats, Clear Test Data, Expand Achievements

## 1. Dashboard Stats Fix

**Problem**: The "Net Profit" stat sums `(final_chips - starting_chips)` across all multiplayer games. Since these are play-money chips and most games end at 0 (busted), this produces large negative numbers that look broken.

**Fix in `src/pages/Dashboard.tsx`** (lines 161-164):
- Replace cumulative chip P&L with **Win Rate** percentage
- Calculation: `Math.round((wins / games) * 100) + '%'`
- Update label from "Net" to "Win Rate"

No changes to `QuickStatsStrip.tsx` needed -- it already accepts a string value.

---

## 2. Clear Test Data (Targeted)

Based on analysis of the database:
- **Admin** (`f42473bf-...`) has **34 records** -- ALL from testing. Delete all of them.
- **Amir** (`9255cdbf-...`) has **77 records total**: 28 are from games with Admin (matched within 30 seconds), 49 are from legitimate games with other players or bots. Delete ONLY the 28 matched ones.

**SQL operations (data tool, not migration):**

```sql
-- Step 1: Delete Admin's 34 test records entirely
DELETE FROM poker_play_results
WHERE user_id = 'f42473bf-b67d-4215-be01-3030648499ed';

-- Step 2: Delete ONLY Amir's 28 records that match Admin games
DELETE FROM poker_play_results a
WHERE a.user_id = '9255cdbf-e1ee-4fd0-b099-3bf8dd7a4291'
AND EXISTS (
  SELECT 1 FROM poker_play_results b
  WHERE b.user_id = 'f42473bf-b67d-4215-be01-3030648499ed'
  AND abs(extract(epoch from a.created_at - b.created_at)) < 30
);
```

Note: Amir's deletion must run BEFORE Admin's deletion (otherwise the join has nothing to match against). These will be run as two sequential operations.

Also clear Admin's XP data and reset:

```sql
DELETE FROM xp_events WHERE user_id = 'f42473bf-b67d-4215-be01-3030648499ed';
UPDATE player_xp SET total_xp = 0, level = 1
WHERE user_id = 'f42473bf-b67d-4215-be01-3030648499ed';
```

Amir's XP and achievements are NOT touched -- only game records from Admin sessions are removed.

---

## 3. Add 50 More Achievements

### File: `src/lib/poker/achievements.ts`

Add 50 new achievements across all rarities. Examples:

| Category | Examples | Rarity |
|----------|----------|--------|
| Career milestones | Play 10/25/50/200/500 hands | Common to Epic |
| Win milestones | Win 5/10/25/50/100 hands | Common to Epic |
| Session milestones | Play 5/10/25/50 sessions | Common to Rare |
| Streaks | Win 15/20 in a row, fold 10 in a row | Rare to Legendary |
| Hand types | Two Pair, Three of a Kind, win with pocket Aces/Kings, win with 7-2 | Common to Legendary |
| Stack achievements | Triple/quadruple/5x/10x stack | Common to Legendary |
| Big pots | Win 100x/200x BB pot | Rare to Epic |
| Social | 25/50/100 chat messages | Common to Rare |
| Strategic | Short stack survival, bluff master | Rare to Epic |
| All-in | Survive 3/5 all-ins | Rare to Epic |

Each gets an XP value in `ACHIEVEMENT_XP` proportional to difficulty (100 to 200,000 XP).

Extend `AchievementContext` with optional fields for new tracking:
- `totalCareerHands`, `totalCareerWins`, `totalCareerSessions`
- `foldStreak`, `eliminatedPlayers`, `wonFirstHand`
- `holeCards` (for detecting specific hand wins like pocket aces, 7-2)

Extend `checkAchievements` to evaluate the new conditions using progress counters.

### File: `src/pages/Profile.tsx`

Add Lucide icon imports for new achievement icons.

Update the icon map (`ICON_MAP`) with all new icon names.

---

## 4. Collapsible Achievements UI

### File: `src/pages/Profile.tsx`

Replace the flat grid with collapsible sections grouped by rarity:

- Import `Collapsible`, `CollapsibleTrigger`, `CollapsibleContent` from `@/components/ui/collapsible`
- Group achievements into 4 rarity buckets: Common, Rare, Epic, Legendary
- Each group is a `Collapsible` with a header showing "Common (8/15)" format
- Header has a chevron that rotates on open/close
- Unlocked achievements shown first within each group
- Default state: Common collapsed, others collapsed

---

## Summary of all changes

| File | Change |
|------|--------|
| `src/pages/Dashboard.tsx` | Replace net profit with win rate |
| `src/lib/poker/achievements.ts` | Add 50 achievements, extend context and checker |
| `src/pages/Profile.tsx` | Add icon imports, collapsible achievements grouped by rarity |
| Database (data only) | Delete Amir's 28 test records + all 34 Admin records + Admin XP reset |

No changes to bottom navigation, layout, spacing, or any other components.

