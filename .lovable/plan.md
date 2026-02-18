

# Fix: Player Leaving Mid-Hand Freezes the Game

## Problem

When a player leaves mid-hand and more than 1 opponent remains, `poker-leave-table` only handles the case where `remainingAfterLeave <= 1` (awarding the pot to the last player). When 2+ players remain, it just deletes the leaving player's seat without:

1. Recording a fold action for the leaving player
2. Checking if the leaving player was the **current actor**
3. Advancing the turn to the next player

This leaves `current_actor_seat` pointing at a deleted seat -- no one can act, the game freezes.

## Fix

**File:** `supabase/functions/poker-leave-table/index.ts`

In the `if (activeHand)` block, when `remainingAfterLeave > 1`, add logic to:

1. Read the full hand state (phase, pots, current_actor_seat, community_cards, state_version, etc.)
2. Record a fold action in `poker_actions` for the leaving player
3. If the leaving player **was the current actor**, compute the next actor seat and commit the state update via `commit_poker_state` with the new `current_actor_seat` and a fresh 20s deadline
4. If the leaving player was NOT the current actor, just insert the fold action (no state commit needed -- the current actor's turn continues)
5. Broadcast the updated `game_state` so clients see the turn advance immediately

### Code changes (lines 85-189)

Replace the existing `if (activeHand)` block. The `remainingAfterLeave <= 1` path stays the same. A new `else` branch handles `remainingAfterLeave > 1`:

```typescript
if (activeHand) {
  if (remainingAfterLeave <= 1) {
    // ... existing pot-award logic stays unchanged ...
  } else {
    // 2+ players remain -- fold the leaving player and advance turn if needed
    const { data: handData } = await admin
      .from("poker_hands")
      .select("*")
      .eq("id", activeHand.id)
      .single();

    if (handData) {
      // Get all actions to determine sequence number
      const { data: actions } = await admin
        .from("poker_actions")
        .select("sequence")
        .eq("hand_id", activeHand.id)
        .order("sequence", { ascending: false })
        .limit(1);
      const nextSeq = ((actions?.[0]?.sequence) ?? 0) + 1;

      // Insert fold action for the leaving player
      await admin.from("poker_actions").insert({
        hand_id: activeHand.id,
        player_id: user.id,
        seat_number: seat.seat_number,
        action_type: "fold",
        amount: 0,
        phase: handData.phase,
        sequence: nextSeq,
      });

      // If leaving player was the current actor, advance the turn
      if (handData.current_actor_seat === seat.seat_number) {
        // Read all seats to find next actor
        const { data: allSeatsFull } = await admin
          .from("poker_seats")
          .select("*")
          .eq("table_id", table_id);

        // Rebuild active seats (excluding leaving player)
        // Find next active seat using simple clockwise scan
        const maxSeats = (table max_seats from poker_tables);
        // ... compute nextActiveSeat ...
        // commit_poker_state with new current_actor_seat + 20s deadline
        // broadcast game_state with updated actor
      }
    }
  }

  // Delete seat
  await admin.from("poker_seats").delete().eq("id", seat.id);
}
```

Since `poker-leave-table` doesn't have the `nextActiveSeat` helper, I will inline a simple clockwise scan:

```typescript
function findNextActive(
  seats: any[], leavingSeatNum: number,
  currentSeat: number, maxSeats: number
): number | null {
  // Active = has player_id, status is "active", not the leaving player
  const eligible = seats.filter((s: any) =>
    s.player_id && s.player_id !== leavingPlayerId &&
    s.status === "active" && s.stack > 0
  );
  if (eligible.length === 0) return null;

  for (let i = 1; i <= maxSeats; i++) {
    const checkSeat = (currentSeat + i) % maxSeats;
    const found = eligible.find((s: any) => s.seat_number === checkSeat);
    if (found) return found.seat_number;
  }
  return eligible[0]?.seat_number ?? null;
}
```

We also need to read `poker_tables` to get `max_seats` -- this is a single extra query.

After computing the next actor, call `commit_poker_state` to atomically update `current_actor_seat` and `action_deadline`, then broadcast the new `game_state`.

Also need to check: if after the fold only 1 non-folded player remains, the hand should complete (last-standing win). This reuses the same pot-award pattern from the existing code.

## Detailed implementation

**File:** `supabase/functions/poker-leave-table/index.ts`

The full `if (activeHand)` block will be rewritten to handle three scenarios:

| Scenario | Remaining after leave | Current actor? | Action |
|----------|----------------------|----------------|--------|
| A | 0 or 1 | N/A | Award pot to last player, complete hand (existing logic) |
| B | 2+ | Yes, leaving player is actor | Fold, find next actor, commit state, broadcast |
| C | 2+ | No | Fold only (current actor's turn continues) |

For scenarios B and C, after the fold we also check if only 1 non-folded player remains -- if so, complete the hand with pot award (same as scenario A).

## What Does NOT Change

- No client-side code changes
- No layout, style, navigation, spacing, or BottomNav changes
- No database schema changes
- No changes to `poker-action` or `poker-check-timeouts`
- No file renames or refactoring

