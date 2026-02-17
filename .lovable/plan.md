
# Fix XP System + Add Level-Up Animation + Tournament Level Gate

## Problem Analysis

**Why XP shows 0 for all players:**

XP is ONLY awarded inside a `useEffect` that depends on `gameOver` being `true` (line 537 of OnlinePokerTable.tsx). But `gameOver` only becomes `true` when:
- A player busts out (stack = 0)
- A player is the last one standing

In practice, most players simply **leave the table** via the "Leave Table" button. The `handleLeave` function calls `leaveTable()` then `onLeave()` -- unmounting the component instantly. `gameOver` is never set to `true`, so the XP-saving effect never fires.

This means **no XP is awarded to players who leave voluntarily**, which is the majority of sessions.

---

## Changes

### Fix 1: Award XP When Player Leaves (not just on game over)

**File:** `src/components/poker/OnlinePokerTable.tsx`

Move the XP/stats saving logic so it fires in TWO scenarios:
1. On `gameOver` (existing -- bust out or winner)
2. On `handleLeave` -- before calling `leaveTable()`

Create a helper function `saveXpAndStats()` that both paths call, guarded by `xpSavedRef` to prevent double-saving.

XP awards per game:
- 25 XP for participating (always)
- 1 XP per hand played
- 10 XP per hand won
- 100 XP bonus for winning the game
- 15% bonus multiplier for tournament games (future)

### Fix 2: Capture Pre-Game Level for Animation

**File:** `src/components/poker/OnlinePokerTable.tsx`

On component mount, fetch the player's current XP/level from `player_xp` table and store it in a ref (`startLevelRef`). When the game ends or the player leaves, compare the new level to the start level. If levels were gained, show the level-up animation overlay.

### Fix 3: Create Level-Up Animation Overlay

**New file:** `src/components/poker/XPLevelUpOverlay.tsx`

A full-screen overlay (like WinnerOverlay) that shows:
- Starting level and ending level
- Animated progress bar that fills through each level (CoD-style)
- Each level-up triggers a brief "flash" animation and level number increment
- Total XP gained summary
- "Continue" button to dismiss

The animation sequence:
1. Show "XP Earned" header with total XP gained
2. Progress bar starts at the pre-game position
3. Bar fills toward next level; when it hits 100%, flash + increment level number
4. Repeat for each level gained
5. Bar settles at final position
6. Show "Continue" button

Timing: ~1.5s per level traversed, max 10s total animation.

### Fix 4: Tournament Level Gate (Level 5 Required)

**File:** `src/components/poker/TournamentLobby.tsx`

Add a check using `usePlayerLevel` hook. If the player's level is below 5, show a locked state instead of the "Create Tournament" / "Register" buttons, with a message: "Reach Level 5 to unlock Tournaments" and their current progress.

### Fix 5: Show Level-Up Overlay on Leave/Game Over

**File:** `src/components/poker/OnlinePokerTable.tsx`

After XP is saved, wait for the `player_xp` table trigger to update, then fetch new level. If new level > start level, show the `XPLevelUpOverlay` instead of immediately calling `onLeave()`. The overlay's "Continue" button then calls `onLeave()`.

---

## Technical Details

### XP Saving Helper (OnlinePokerTable.tsx)

```typescript
const saveXpAndStats = useCallback(async () => {
  if (xpSavedRef.current || !user) return;
  xpSavedRef.current = true;

  const mySeatInfo = tableState?.seats.find(s => s.player_id === user.id);
  const finalChips = mySeatInfo?.stack ?? 0;
  const isWinner = finalChips > 0 && 
    tableState?.seats.filter(s => s.player_id && s.stack > 0).length === 1;

  // Save play result
  await supabase.from('poker_play_results').insert({...});

  // Award XP
  const xpEvents = [];
  xpEvents.push({ user_id: user.id, xp_amount: 25, reason: 'game_complete' });
  if (isWinner) xpEvents.push({ user_id: user.id, xp_amount: 100, reason: 'game_win' });
  if (handsPlayedRef.current > 0) 
    xpEvents.push({ user_id: user.id, xp_amount: handsPlayedRef.current, reason: 'hands_played' });
  if (handsWonRef.current > 0) 
    xpEvents.push({ user_id: user.id, xp_amount: handsWonRef.current * 10, reason: 'hands_won' });

  await supabase.from('xp_events').insert(xpEvents);
  
  // Fetch updated level for animation
  const { data: newXp } = await supabase.from('player_xp')
    .select('total_xp').eq('user_id', user.id).maybeSingle();
  return newXp?.total_xp ?? 0;
}, [user, tableState, ...]);
```

### XP Level-Up Overlay (new component)

```
+-----------------------------+
|                             |
|       XP EARNED: +135       |
|                             |
|   Level 2  >>>>>>>>  Lv 3   |
|   [=============>----]      |
|   Level 3  >>>>>>>>  Lv 4   |
|   [======>-----------]      |
|                             |
|       [ Continue ]          |
+-----------------------------+
```

The progress bars animate sequentially, each taking ~1.2s. Gold color scheme matching the existing poker UI (hsl(43 74% 49%)).

### handleLeave Updated Flow

```
handleLeave() {
  1. saveXpAndStats()
  2. if (levels gained > 0) -> show XPLevelUpOverlay
  3. else -> leaveTable() + onLeave()
}
```

The overlay's "Continue" button calls `leaveTable()` then `onLeave()`.

### Tournament Level Gate

In TournamentLobby, wrap the create/register actions:
```tsx
const levelData = usePlayerLevel(user?.id);
const canPlayTournaments = (levelData?.level ?? 0) >= 5;
```

If `!canPlayTournaments`, show a locked badge with progress toward level 5.

---

## Files Changed

| File | Change |
|------|--------|
| `src/components/poker/OnlinePokerTable.tsx` | Extract XP save helper, call on leave + game over, capture start level, show level-up overlay |
| `src/components/poker/XPLevelUpOverlay.tsx` | NEW - animated level-up progress screen |
| `src/components/poker/TournamentLobby.tsx` | Add level 5 gate for tournament access |

## What Does NOT Change

- No style, layout, navigation, or spacing changes to existing components
- No changes to BottomNav
- No refactoring or renaming
- WinnerOverlay unchanged (level-up overlay is a separate component shown after)
- XP trigger and player_xp table unchanged (already working correctly)
- No server-side changes needed
