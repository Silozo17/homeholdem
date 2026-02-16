
# Fix "Winner Unknown" in Multiplayer Showdown

## Root Cause

The `hand_result` broadcast from the server contains only `winners`, `revealed_cards`, `pots`, and `state_version` -- it does **not** include a `seats` array. But the client code on line 192 of `useOnlinePokerTable.ts` tries to look up `payload.seats` to find display names:

```typescript
const seatData = (payload.seats || []).find(...)
```

Since `payload.seats` is always `undefined`, `seatData` is always `undefined`, so every winner falls back to `'Unknown'`.

## Fix

In `src/hooks/useOnlinePokerTable.ts`, inside the `hand_result` handler (around line 191-199), look up the display name from the existing `tableState.seats` (which is populated by previous `game_state` broadcasts) instead of from `payload.seats`.

Change:
```typescript
const seatData = (payload.seats || []).find((s: any) => s.player_id === w.player_id);
```

To:
```typescript
const seatData = tableState?.seats.find((s) => s.player_id === w.player_id);
```

This ensures the winner's display name comes from the already-known seat data that the client has been tracking throughout the hand.

Single line change in one file.
