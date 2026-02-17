

# Fix: Players Joining Mid-Hand Disrupting Active Game

## Problem

When a player joins mid-hand, three things go wrong:

1. **Server (`poker-table-state`)** reports `has_cards: true` for the new player because it only checks `status !== 'folded'` and `player_id` exists -- it doesn't verify the player actually has hole cards for this hand.
2. **Client (`seat_change` handler)** calls `refreshState()` which replaces the entire seat list, causing the UI to re-render all seats and visually shift cards.
3. **No visual queuing** -- the seat appears instantly, disrupting the active hand's visual state.

## Solution: 3 Changes

### Change 1: Fix `poker-table-state` -- accurate `has_cards` flag

**File:** `supabase/functions/poker-table-state/index.ts`

The `has_cards` field at line 167-168 currently says `true` for any non-folded player during an active hand. This is wrong for `sitting_out` players who joined mid-hand and have no hole cards.

Fix: check if the player actually has a hole card record for the current hand.

```typescript
// After fetching handActions, also get the list of players who actually have hole cards
let holeCardPlayerIds: Set<string> = new Set();
if (currentHand) {
  const { data: holeCardRows } = await admin
    .from("poker_hole_cards")
    .select("player_id")
    .eq("hand_id", currentHand.id);
  holeCardPlayerIds = new Set((holeCardRows || []).map((r: any) => r.player_id));
}

// Then in the seat mapping, change has_cards to:
has_cards: currentHand && holeCardPlayerIds.has(s.player_id) && derivedStatus !== "folded"
```

### Change 2: Client `seat_change` handler -- don't replace active hand seats

**File:** `src/hooks/useOnlinePokerTable.ts` (lines 259-278)

Currently, the `seat_change` handler calls `refreshState()` unconditionally (line 277). During an active hand, `refreshState()` replaces the full seat array, which can disrupt card animations and visual state.

Fix: during an active hand, only add the new seat to the local state without touching existing seats. Do NOT call `refreshState()` during an active hand -- defer the full state sync to after the hand completes.

```typescript
.on('broadcast', { event: 'seat_change' }, ({ payload }) => {
  if (payload?.action === 'table_closed') {
    setTableState(null);
    return;
  }
  if (payload?.action === 'leave' && payload?.seat != null) {
    setTableState(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        seats: prev.seats.map(s =>
          s.seat === payload.seat
            ? { ...s, player_id: null, display_name: '', avatar_url: null, stack: 0, status: 'empty', has_cards: false, current_bet: 0, last_action: null }
            : s
        ),
      };
    });
  }
  if (payload?.action === 'join') {
    const currentState = tableStateRef.current;
    const handActive = !!currentState?.current_hand;
    if (handActive) {
      // Mid-hand join: add seat locally as sitting_out with has_cards=false
      // Do NOT refreshState -- it would replace the active hand's seat array
      setTableState(prev => {
        if (!prev) return prev;
        const alreadyExists = prev.seats.some(s => s.seat === payload.seat);
        if (alreadyExists) return prev;
        return {
          ...prev,
          seats: [...prev.seats, {
            seat: payload.seat,
            player_id: payload.player_id,
            display_name: payload.display_name || 'Player',
            avatar_url: null,
            country_code: null,
            stack: 0,
            status: 'sitting_out',
            has_cards: false,
            current_bet: 0,
            last_action: null,
          }],
        };
      });
      return; // Skip refreshState during active hand
    }
  }
  // No active hand: safe to do a full refresh
  refreshState();
})
```

### Change 3: Broadcast join with display_name from server

**File:** `supabase/functions/poker-join-table/index.ts`

Currently the `seat_change` broadcast sends `display_name: null` (line 170). The client needs the display name to show the new player's seat correctly without calling `refreshState`.

Fix: fetch the player's profile before broadcasting.

```typescript
// Before broadcast, fetch profile
const { data: profile } = await admin
  .from("profiles")
  .select("display_name, avatar_url")
  .eq("id", user.id)
  .single();

// Update broadcast payload
payload: {
  seat: seat_number,
  player_id: user.id,
  display_name: profile?.display_name || 'Player',
  avatar_url: profile?.avatar_url || null,
  action: "join",
  stack: buy_in_amount,
}
```

## Summary

| File | Change |
|------|--------|
| `supabase/functions/poker-table-state/index.ts` | Check `poker_hole_cards` for accurate `has_cards` flag |
| `src/hooks/useOnlinePokerTable.ts` | Skip `refreshState()` during active hand on `seat_change`; add new seat locally as `sitting_out` with `has_cards: false` |
| `supabase/functions/poker-join-table/index.ts` | Include `display_name`, `avatar_url`, and `stack` in broadcast payload |

## What Does NOT Change

- No UI/layout/navigation/BottomNav changes
- No changes to game logic, pot calculations, or deal animations
- No database schema changes
- No changes to `poker-start-hand`, `poker-action`, `poker-check-timeouts`
- The 3-second cooldown for activating new players in the next hand stays as-is (it works correctly)

