
# Fix: Error Boundary Crash on Fold + Cards Re-Reveal + Extra Turn Loop

## Three Issues, Two Root Causes

### Issue 1: "Reconnect" screen appears when anyone folds

**Root cause:** `GameStateDebugPanel` crashes on line 112 (`hand.community_cards.length`) and line 130 (`hand.pots.length`) when these properties are undefined during state transitions. The `PokerErrorBoundary` catches the crash and shows the "Something went wrong" screen.

**Fix:** Add null guards in `GameStateDebugPanel`:
- Line 112: `hand.community_cards?.length` and `(hand.community_cards ?? [])`
- Line 130: `(hand.pots ?? []).length`
- Line 133: `(p.eligible_player_ids ?? []).length`

**File:** `src/components/poker/GameStateDebugPanel.tsx`

### Issue 2 + 3: Cards re-reveal and extra turns when player joins/leaves

**Root cause:** The `hand_result` broadcast handler in `useOnlinePokerTable.ts` line 355 does:
```typescript
seats: payload.seats || prev.seats,
```
This **replaces the entire seat array** with the server's version (which may include newly joined players), completely bypassing the merge fix we applied to the `game_state` handler. This causes:
- The seat array length to change, forcing React to remount `PlayerSeat` components (cards re-reveal)
- New players to appear as `active` in the local state during hand completion

**Fix:** Apply the same merge logic to `hand_result`:
```typescript
seats: prev.seats.map(existingSeat => {
  const updated = (payload.seats || []).find((s: any) => s.seat === existingSeat.seat);
  return updated ? { ...existingSeat, ...updated } : existingSeat;
}),
```

**File:** `src/hooks/useOnlinePokerTable.ts`, line 355

## Summary of Changes

| File | Change | Lines |
|------|--------|-------|
| `src/components/poker/GameStateDebugPanel.tsx` | Add null guards for `community_cards`, `pots`, `eligible_player_ids` | 112, 130, 133 |
| `src/hooks/useOnlinePokerTable.ts` | Merge seats in `hand_result` handler instead of replacing | 355 |

## What Does NOT Change

- No layout, style, navigation, spacing, or BottomNav changes
- No database/edge function changes
- No file renames or refactoring
- No changes to game logic or deal animations
