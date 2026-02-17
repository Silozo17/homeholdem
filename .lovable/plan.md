
# Fix: Auto-Runout When All Opponents Are All-In

## The Bug

In the multiplayer `poker-action` edge function, when one player calls an all-in and is the only player with chips remaining, the server still asks that player to act on each subsequent street (check on flop, check on turn, check on river) instead of automatically dealing out all remaining community cards.

**Root cause** is in `poker-action/index.ts` lines 380-388:

```text
} else if (activePlayers.length === 0) {
    // All remaining players are all-in -- run out community cards
    roundComplete = true;
} else {
    // Check if all active players have acted and bets are equal
    ...
}
```

When Player A (10,000 chips) calls Player B's all-in (400 chips):
- Player B is `all-in` (status)
- Player A is still `active` (has chips left)
- `activePlayers.length === 1` (not 0)
- So it falls into the `else` branch and treats it as a normal round
- Each new phase asks Player A to act again

The condition at line 423 that runs out all cards also only checks `activePlayers.length === 0`, missing the case where 1 active player has no opponents to bet against.

## The Fix

**One line change in the condition logic.** When only 1 active player remains and everyone else is either folded or all-in, there is no further betting possible. The hand should auto-run out all remaining community cards to showdown.

### Change 1: Round completion check (line 380)

```
// BEFORE:
} else if (activePlayers.length === 0) {

// AFTER:
} else if (activePlayers.length === 0 || 
           (activePlayers.length === 1 && allInPlayers.length > 0)) {
```

This catches both scenarios:
- All players are all-in (existing)
- Only 1 player has chips, rest are all-in (the reported bug)

### Change 2: Runout check (line 423)

```
// BEFORE:
if (activePlayers.length === 0 && nonFolded.length > 1) {

// AFTER:
if (activePlayers.length <= 1 && allInPlayers.length > 0 && nonFolded.length > 1) {
```

This ensures all remaining community cards are dealt at once and the phase jumps straight to showdown, rather than advancing one street at a time.

### Why the bot game already works

The practice mode (`usePokerGame.ts` line 572) already handles this correctly with `getActionablePlayers(state.players).length <= 1` -- it auto-advances through phases with a dramatic delay. No changes needed there.

## File Summary

| File | Change |
|------|--------|
| `supabase/functions/poker-action/index.ts` | Fix two conditions (lines 380 and 423) to detect "1 active + all-in opponents" as a runout scenario |

This is a 2-line fix in a single file.
