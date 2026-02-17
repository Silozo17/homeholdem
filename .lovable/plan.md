

# Fix XP Abuse + Level-Based Badge Animations

## Issue 1: Free XP on Join-and-Leave

**Root Cause:** `saveXpAndStats` in `OnlinePokerTable.tsx` (line 574) always inserts a `game_complete` XP event worth 25 XP, even when `handsPlayedRef.current === 0`. A player can sit down and immediately leave to farm 25 XP per attempt.

Same issue in `PlayPoker.tsx` (line 49) -- quitting a practice game instantly awards 25 XP.

**Fix:**
- `src/components/poker/OnlinePokerTable.tsx` (line 546-581): Skip ALL XP and result saving if `handsPlayedRef.current === 0`. Add an early return: `if (handsPlayedRef.current === 0) return;` right after the `xpSavedRef` guard. This means you must play at least 1 hand to receive any XP.
- `src/pages/PlayPoker.tsx` (line 25-52): Same guard -- skip saving if `state.handsPlayed === 0`.

## Issue 2: Level Badge Animation Scales with Level

**Current:** Every level gets the same `animate-fire-glow` animation with identical orange glow.

**Fix in `src/components/common/LevelBadge.tsx`:**
- Compute an "intensity tier" from the level (0-4 scale):
  - Level 1-4: tier 0 -- no animation, plain dark badge with subtle border
  - Level 5-14: tier 1 -- slow gentle pulse (3s cycle), faint warm glow
  - Level 15-29: tier 2 -- medium pulse (2s cycle), orange glow
  - Level 30-59: tier 3 -- faster pulse (1.5s cycle), bright orange-red glow, larger shadow radius
  - Level 60+: tier 4 -- fast intense pulse (1s cycle), red-hot glow with large shadow, border color shifts to bright red/gold

- Apply the glow via inline `style` with `animation` and `boxShadow` instead of the single `animate-fire-glow` Tailwind class. This avoids needing 5 new Tailwind keyframes and keeps it self-contained.

**Fix in `tailwind.config.ts`:** No changes needed -- inline styles handle the tiers.

## Files Changed

| File | Change |
|------|--------|
| `src/components/poker/OnlinePokerTable.tsx` | Skip XP/result save when handsPlayed is 0 |
| `src/pages/PlayPoker.tsx` | Skip XP/result save when handsPlayed is 0 |
| `src/components/common/LevelBadge.tsx` | Level-scaled animation intensity (5 tiers from static to fiery) |

## What Does NOT Change

- No layout, navigation, spacing, or style changes outside LevelBadge
- No BottomNav changes
- No database schema changes
- No edge function changes
- No refactoring or renaming

