
# Fix: Players Not Visible to Each Other at Poker Table

## Root Cause

The `game_state` broadcast handler in `useOnlinePokerTable.ts` (line 261) merges seat data using `.map()` over `prev.seats` only. This means it only updates seats that already exist in local state -- it **never adds** new seats that appear in the broadcast.

The intended flow is:
1. Player joins -> `seat_change` broadcast fires -> client adds new seat to local state
2. Subsequent `game_state` broadcasts update that seat's data

But if the `seat_change` broadcast is missed (network hiccup, late subscription, race condition), the new player's seat never gets added to local state. The `game_state` broadcasts keep arriving with all seats including the new player, but the `.map()` silently ignores any seats not already in `prev.seats`.

This is why Admin can't see Amir -- Admin missed the `seat_change` for Amir's join, and `game_state` never reconciles the missing seat.

## Fix

**File: `src/hooks/useOnlinePokerTable.ts` (lines 259-265)**

After mapping existing seats, also append any seats from the broadcast that don't exist in local state. This ensures `game_state` is self-healing -- even if `seat_change` was missed, the next `game_state` broadcast will add the missing player.

```typescript
// Current (broken):
const mergedSeats = prev.seats.map(existingSeat => {
  const updated = seats.find(s => s.seat === existingSeat.seat);
  return updated ? { ...existingSeat, ...updated } : existingSeat;
});

// Fixed:
const mergedSeats = prev.seats.map(existingSeat => {
  const updated = seats.find(s => s.seat === existingSeat.seat);
  return updated ? { ...existingSeat, ...updated } : existingSeat;
});
// Self-healing: add any seats from broadcast that are missing locally
const existingSeatNumbers = new Set(prev.seats.map(s => s.seat));
const newSeats = seats
  .filter(s => !existingSeatNumbers.has(s.seat) && s.player_id)
  .map(s => ({
    seat: s.seat,
    player_id: s.player_id,
    display_name: s.display_name || 'Player',
    avatar_url: s.avatar_url || null,
    country_code: s.country_code || null,
    stack: s.stack ?? 0,
    status: s.status || 'sitting_out',
    has_cards: s.has_cards || false,
    current_bet: s.current_bet ?? 0,
    last_action: s.last_action ?? null,
  }));
const allSeats = [...mergedSeats, ...newSeats];
return { ...prev, current_hand: broadcastHand, seats: allSeats };
```

This is the smallest possible change -- it only adds missing seats, never removes or reorders existing ones. It makes the `game_state` handler self-healing without needing a full `refreshState`.

## Files Modified

| File | Change |
|------|--------|
| `src/hooks/useOnlinePokerTable.ts` | Add self-healing seat reconciliation in `game_state` handler (~5 lines added) |

## What Does NOT Change

- No database, schema, or edge function changes
- No navigation, bottom nav, or layout changes
- No changes to any other poker logic or timing
- No changes to `seat_change` handler (it still works as before)
