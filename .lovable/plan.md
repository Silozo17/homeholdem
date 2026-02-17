
# Comprehensive Fix: 4 Critical Poker Game Issues

## Issue 1: Emoji and Achievement Jitter (Jump to Left)

**Root Cause**: CSS `transform` property conflict. When an element uses `translateX(-50%)` for centering AND has an animation that sets `transform` (like `translateY`, `scale`), the animation **overwrites** the entire `transform` property, removing the horizontal centering. This causes a visible snap/jump to the left.

**Affected locations**:
- `AchievementToast.tsx` (line 60): outer div uses `left-1/2 -translate-x-1/2`, inner div uses `animation: 'fade-in 0.3s'` which has `translateY(10px)` -- overwrites the `-translate-x-1/2`
- `OnlinePokerTable.tsx` (line 828-829): chat bubbles use inline `transform: 'translateX(-50%)'` with `animate-emote-pop` (scale transform) and `animate-float-up` (translateY transform)
- `tailwind.config.ts` lines 103-111: `fade-in` keyframes include `translateY` which conflicts

**Fix** (3 files):

1. **`tailwind.config.ts`** -- Remove `translateY` from `fade-in` keyframes, use opacity-only:
```
"fade-in": {
  from: { opacity: "0" },
  to: { opacity: "1" },
}
```

2. **`src/index.css`** -- Update `float-up` keyframes to include `translateX(-50%)` so it preserves centering:
```css
@keyframes float-up {
  0%   { opacity: 1; transform: translateX(-50%) translateY(0); }
  75%  { opacity: 1; transform: translateX(-50%) translateY(-8px); }
  100% { opacity: 0; transform: translateX(-50%) translateY(-20px); }
}
```

3. **`src/components/poker/OnlinePokerTable.tsx`** (lines 828-831) -- For emote-pop, wrap in a positioning div and apply animation to inner element:
```tsx
// Outer div: positioning only (no animation)
<div style={{ left: `${pos.xPct}%`, top: `${pos.yPct - 12}%`, transform: 'translateX(-50%)', zIndex: Z.EFFECTS + 5 }}>
  {/* Inner div: animation only (no positioning transform) */}
  <div className={cn('pointer-events-none', isSingleEmoji ? 'animate-emote-pop' : 'animate-float-up')}
       style={isSingleEmoji ? {} : { transform: undefined }}>
    ...
  </div>
</div>
```
For `animate-float-up`, since the keyframes now include `translateX(-50%)`, the outer div's inline `transform` will be overridden correctly. For `animate-emote-pop`, the scale animation goes on the inner div so it doesn't touch the outer positioning.

---

## Issue 2: Users Cannot Change Usernames

**Current state**: `Profile.tsx` displays `display_name` as read-only text (line 244). No edit UI exists.

**Fix** (`src/pages/Profile.tsx`):
- Add an edit icon button next to the display name
- On tap, replace the name with an input field pre-filled with current name
- Add Save/Cancel buttons
- On save, call `supabase.from('profiles').update({ display_name }).eq('id', user.id)`
- Show a success toast on save

State additions: `editingName` (boolean), `newName` (string), `savingName` (boolean)

---

## Issue 3: XP System Completely Broken

**Root Cause**: Two problems found:
1. The `xp_events` table has **zero INSERT policies** -- users cannot insert rows. The `update_player_xp()` trigger function exists but is never triggered because nothing can write to `xp_events`.
2. `PlayPoker.tsx` saves to `poker_play_results` but **never inserts into `xp_events`**. No code in the entire codebase writes to `xp_events`.

**Fix** (2 changes):

1. **Database migration** -- Add INSERT RLS policy:
```sql
CREATE POLICY "Users can insert own xp_events"
  ON public.xp_events FOR INSERT
  WITH CHECK (user_id = auth.uid());
```

2. **`src/pages/PlayPoker.tsx`** -- After inserting into `poker_play_results`, also insert XP events:
```typescript
// Calculate XP
const xpEvents = [];
const isWinner = humanPlayer && humanPlayer.chips > 0 &&
  state.players.filter(p => p.chips > 0).length === 1;

// +25 for game completion
xpEvents.push({ user_id: user.id, reason: 'game_complete', xp_amount: 25 });
// +100 for winning
if (isWinner) xpEvents.push({ user_id: user.id, reason: 'game_win', xp_amount: 100 });
// +10 per hand won
if (state.handsWon > 0) xpEvents.push({ user_id: user.id, reason: 'hands_won', xp_amount: state.handsWon * 10 });

await supabase.from('xp_events').insert(xpEvents);
```

---

## Issue 4: Winner Has No End Game Screen (Stuck at Table)

**Root Cause**: Two separate paths are broken:

### Practice mode (`usePokerGame.ts`):
- Line 452: `case 'QUIT': return { ...state, phase: 'game_over' }` -- does NOT populate `lastHandWinners`, so the game-over overlay has no winner data.
- The auto-advance at line 554-558 fires `NEXT_HAND` after 4.5s on `hand_complete`. When `alivePlayers <= 1`, lines 427-435 correctly transition to `game_over` with winners populated. This path **should work** for the winner.
- However, if the winner clicks the exit button instead of waiting for auto-advance, the `QUIT` path loses all winner data.

### Multiplayer mode (`OnlinePokerTable.tsx`):
- Lines 336-346: Game over detection ONLY fires when `mySeatInfo.stack <= 0` (the **loser**). **Winners are never shown the game over screen.** The winner stays at the table indefinitely with no overlay, no stats, and no way to see they won.

**Fix**:

1. **`src/hooks/usePokerGame.ts`** (line 452) -- `QUIT` case must populate `lastHandWinners`:
```typescript
case 'QUIT': {
  const alivePlayers = state.players.filter(p => p.chips > 0);
  const gameOverWinners = alivePlayers.length > 0
    ? alivePlayers.map(p => ({
        playerId: p.id,
        name: p.name,
        handName: state.lastHandWinners?.[0]?.handName || 'N/A',
        chipsWon: p.chips,
      }))
    : state.lastHandWinners || [];
  return { ...state, phase: 'game_over', lastHandWinners: gameOverWinners };
}
```

2. **`src/components/poker/OnlinePokerTable.tsx`** (lines 336-346) -- Fix game over detection to also trigger for **winners** (last player standing):
```typescript
useEffect(() => {
  if (!tableState || !user) return;
  const activePlayers = tableState.seats.filter(s => s.player_id && s.stack > 0);
  const mySeatInfo = tableState.seats.find(s => s.player_id === user.id);

  // LOSER: my stack is 0 after a hand result
  if (mySeatInfo && mySeatInfo.stack <= 0 && handWinners.length > 0) {
    const timer = setTimeout(() => {
      setGameOver(true);
      setGameOverWinners(handWinners);
    }, 4000);
    return () => clearTimeout(timer);
  }

  // WINNER: I'm the last player with chips
  if (mySeatInfo && mySeatInfo.stack > 0 && activePlayers.length === 1
      && activePlayers[0].player_id === user.id && handWinners.length > 0) {
    const timer = setTimeout(() => {
      setGameOver(true);
      setGameOverWinners(handWinners);
    }, 4000);
    return () => clearTimeout(timer);
  }
}, [tableState, user, handWinners]);
```

---

## Additional Issue Found: "Play Again" Button in Game Over

**In practice mode**: `PokerTablePro.tsx` line 521 passes `onNextHand={onQuit}` for game over. `onQuit` is `resetGame` which dispatches `RESET` returning to idle/lobby. This should work correctly now.

**In multiplayer mode**: `OnlinePokerTable.tsx` line 772 passes `onNextHand={() => {}}` (no-op) for game over. The "Play Again" button does nothing. Fix: make it call `leaveTable().then(onLeave)` same as the quit button, so the user returns to the lobby.

---

## Summary of All File Changes

| File | Change |
|------|--------|
| `tailwind.config.ts` | Remove `translateY` from `fade-in` keyframes |
| `src/index.css` | Update `float-up` keyframes to preserve `translateX(-50%)` |
| `src/components/poker/OnlinePokerTable.tsx` | Fix game over for winners, fix emoji jitter wrapping, fix "Play Again" button |
| `src/components/poker/AchievementToast.tsx` | No further changes needed (fade-in fix in tailwind handles it) |
| `src/hooks/usePokerGame.ts` | Fix QUIT action to populate `lastHandWinners` |
| `src/pages/PlayPoker.tsx` | Add XP event insertion after game results save |
| `src/pages/Profile.tsx` | Add inline username editing with save to database |
| **Database migration** | Add INSERT RLS policy on `xp_events` for `auth.uid()` |
