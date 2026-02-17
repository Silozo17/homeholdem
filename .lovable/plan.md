

# Tighten Mid-Hand Join: Replace Push with Map + Add Server Guard

## Issues with current implementation

1. **Array push is fragile**: `[...prev.seats, newSeat]` can create duplicates or break seat ordering. Seats should be a fixed-length array indexed by seat number. The fix should use `.map()` to update the matching seat entry in-place.

2. **No server-side guard against late joiners acting**: `poker-action` checks `current_actor_seat` (which prevents most abuse), but does NOT explicitly verify the player has hole cards for this hand. If somehow a late joiner ended up as `current_actor_seat` (e.g. a bug), they could act. Adding a single hole-cards check makes this bulletproof.

## Changes (2 files, minimal)

### Change 1: `src/hooks/useOnlinePokerTable.ts` -- Replace push with map

Replace the `join` handler's mid-hand branch (lines 285-304). Instead of appending to the array, map over existing seats and update the matching seat number:

```typescript
if (payload?.action === 'join') {
  const currentState = tableStateRef.current;
  const handActive = !!currentState?.current_hand;
  if (handActive) {
    setTableState(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        seats: prev.seats.map(s =>
          s.seat === payload.seat
            ? {
                ...s,
                player_id: payload.player_id,
                display_name: payload.display_name || 'Player',
                avatar_url: payload.avatar_url || null,
                stack: payload.stack || 0,
                status: 'sitting_out',
                has_cards: false,
                current_bet: 0,
                last_action: null,
              }
            : s
        ),
      };
    });
    return; // Skip refreshState during active hand
  }
}
```

This is safe because:
- Seat entries are always pre-populated (0..maxSeats-1) from the server
- No duplicates, no ordering issues
- If the seat doesn't exist in the array (shouldn't happen), nothing breaks -- it just won't show until the next full refresh

### Change 2: `supabase/functions/poker-action/index.ts` -- Reject actions from players without hole cards

After the "Not seated" check (line 196), before checking `current_actor_seat`, add:

```typescript
// Reject if player has no hole cards for this hand (mid-hand joiner)
const { count: playerHoleCards } = await admin
  .from("poker_hole_cards")
  .select("id", { count: "exact", head: true })
  .eq("hand_id", hand_id)
  .eq("player_id", user.id);

if (!playerHoleCards || playerHoleCards === 0) {
  return new Response(
    JSON.stringify({ error: "Not in this hand" }),
    { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}
```

This is the "must-have" guard: even if all other checks fail, a player without hole cards for the current hand cannot act.

## What Does NOT Change

- No UI/layout/navigation/BottomNav changes
- No database schema changes
- No changes to `poker-start-hand`, `poker-table-state`, `poker-join-table`, `poker-check-timeouts`
- The `sitting_out` status and 3-second activation cooldown stay as-is
- The `has_cards` server-side fix from the previous change stays
- The `hand_result` full refresh stays

