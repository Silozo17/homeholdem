

# Fix: Player Stays After Losing All-In + Disconnect Blocking Controls

## Issue 1: Player with 0 chips stays seated after losing

**Root cause:** When a player goes all-in and loses, the hand completes and their stack is set to 0. But nobody removes them from their seat. The next hand simply skips them (`activePlayers = seats.filter(s => s.stack > 0)`), so they sit at the table as a ghost -- visible but never dealt in.

**Fix:** Add a cleanup step in `poker-start-hand` that auto-removes any seated player with 0 chips before the new hand begins. This happens after the `sitting_out` activation step and before fetching active seats.

**File: `supabase/functions/poker-start-hand/index.ts`** (after line 237, before line 240)

Add:
```typescript
// Auto-kick players with 0 chips (busted)
const { data: bustedSeats } = await admin
  .from("poker_seats")
  .select("id, seat_number, player_id")
  .eq("table_id", table_id)
  .eq("stack", 0)
  .not("player_id", "is", null);

for (const busted of bustedSeats || []) {
  await admin.from("poker_seats").delete().eq("id", busted.id);
  const ch = admin.channel(`poker:table:${table_id}`);
  await ch.send({
    type: "broadcast",
    event: "seat_change",
    payload: { action: "kicked", seat: busted.seat_number, player_id: busted.player_id, reason: "busted" },
  });
}
```

This ensures busted players are removed and all clients see the seat empty before a new hand starts.

---

## Issue 2: Disconnect removes player mid-hand without folding

**Root cause:** When a player disconnects (heartbeat stale for 90s), the cleanup in `poker-check-timeouts` section 4 (line 493-523) sets `player_id = null` on the seat immediately, regardless of whether a hand is active. If the disconnected player was the current actor, the next timeout check finds an empty actor seat and force-completes the hand. If they were NOT the actor but still in the hand, the game continues with their seat data wiped -- which can cause errors or stuck states for other players.

**Fix:** Before kicking a stale-heartbeat player, check if there's an active hand at that table. If so, mark the seat as `disconnected` instead of clearing it, which lets the existing timeout-fold logic handle them gracefully (they get auto-folded on their turn, and the hand continues normally).

**File: `supabase/functions/poker-check-timeouts/index.ts`** (section 4, lines 493-523)

Replace the heartbeat kick logic with:
```typescript
for (const seat of staleSeats || []) {
  try {
    // Check if there's an active hand at this table
    const { data: activeHand } = await admin
      .from("poker_hands")
      .select("id")
      .eq("table_id", seat.table_id)
      .is("completed_at", null)
      .maybeSingle();

    if (activeHand) {
      // Mid-hand: mark as disconnected, let timeout-fold handle it
      await admin
        .from("poker_seats")
        .update({ status: "disconnected" })
        .eq("id", seat.id);
    } else {
      // No active hand: safe to remove entirely
      await admin
        .from("poker_seats")
        .delete()
        .eq("id", seat.id);
    }

    const hbChannel = admin.channel(`poker:table:${seat.table_id}`);
    await hbChannel.send({
      type: "broadcast",
      event: "seat_change",
      payload: { action: "disconnected", seat: seat.seat_number, player_id: seat.player_id },
    });

    heartbeatKicks.push({ ... });
  } catch (hbErr) { ... }
}
```

This prevents the race condition where clearing the seat mid-hand causes the current actor to vanish and blocks other players' controls.

---

## Summary

| File | Change | Impact |
|------|--------|--------|
| `supabase/functions/poker-start-hand/index.ts` | Auto-remove 0-stack players before new hand | Busted players no longer sit as ghosts |
| `supabase/functions/poker-check-timeouts/index.ts` | Mark disconnected players as "disconnected" during active hand instead of removing | Prevents mid-hand seat wipe that blocks other players |

## What Is NOT Changed
- Bottom navigation, UI components, styles, spacing
- Betting controls, seat layout, game logic
- No new tables or schema changes
- No client-side code changes

