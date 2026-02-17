

# Fix: Race Condition Causing Duplicate Hands + Animation Chaos

## Root Cause Found

The edge function logs and database confirm the exact problem: **two hands were started simultaneously** for the same table.

```
22:12:51.523 - Hand 608bd0dc (hand #1) started - 2 players
22:12:51.548 - Hand cfb43d37 (hand #1) started - 2 players
```

Both requests passed the "no active hand" check (lines 194-226 in `poker-start-hand`) before either had finished inserting their hand row. This is a classic time-of-check-time-of-use (TOCTOU) race condition.

This was made worse by the recent timeout polling change: ALL seated players now poll `poker-check-timeouts`, and the auto-start logic runs on multiple clients. More clients calling `poker-start-hand` simultaneously = higher chance of the race.

**This single bug explains ALL reported symptoms:**
- Cards dealt on every flop = second hand's broadcast re-triggers deal animation
- Animations trigger again and again = conflicting state broadcasts from two concurrent hands
- Cards move to different players when someone joins = two active hands with different seat snapshots conflict

## Fix (3 changes)

### Change 1: Database -- Add unique partial index to prevent duplicate active hands

Create a partial unique index on `poker_hands` that only allows ONE non-completed hand per table at any time. If a second concurrent `INSERT` hits this constraint, it will fail, which the edge function can catch gracefully.

```sql
CREATE UNIQUE INDEX IF NOT EXISTS one_active_hand_per_table
ON poker_hands(table_id)
WHERE completed_at IS NULL;
```

This is an atomic, database-level guarantee -- no race condition can bypass it.

### Change 2: `poker-start-hand` -- Catch the duplicate insert error

**File:** `supabase/functions/poker-start-hand/index.ts`

After the `poker_hands` insert (line 429-456), if `handErr` contains a unique constraint violation, return a clean error instead of crashing:

```typescript
if (handErr) {
  if (handErr.code === '23505') {
    // Unique constraint: another hand was started simultaneously
    return new Response(
      JSON.stringify({ error: "Hand already in progress" }),
      { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
  throw handErr;
}
```

### Change 3: Revert all-players polling to leader-only

**File:** `src/hooks/useOnlinePokerTable.ts` (lines 608-635)

The change that made ALL seated players poll for timeouts dramatically increased the number of concurrent `poker-start-hand` and `poker-check-timeouts` calls, directly causing the race condition. Revert this to leader-only polling (the original 8s interval).

The stale hand recovery (line 581-593) already provides a backup path for non-leader clients -- that is sufficient redundancy.

```typescript
// Revert to leader-only timeout polling
useEffect(() => {
  if (!isAutoStartLeader || !tableId) return;
  timeoutPollRef.current = setInterval(async () => {
    const currentState = tableStateRef.current;
    const currentHand = currentState?.current_hand;
    if (!currentHand?.action_deadline) return;
    const deadline = new Date(currentHand.action_deadline).getTime();
    if (Date.now() > deadline + 3000) {
      try {
        await callEdge('poker-check-timeouts', { table_id: tableId });
        refreshState();
      } catch {}
    }
  }, 8000);
  return () => {
    if (timeoutPollRef.current) {
      clearInterval(timeoutPollRef.current);
      timeoutPollRef.current = null;
    }
  };
}, [isAutoStartLeader, tableId, refreshState]);
```

Keep the reduced 5s tolerance and 1-timeout auto-kick from `poker-check-timeouts` -- those are fine. The stale hand recovery calling `poker-check-timeouts` (line 588) stays too -- that provides the non-leader backup.

## Summary

| File/Resource | Change |
|------|--------|
| Database migration | Add `one_active_hand_per_table` unique partial index |
| `supabase/functions/poker-start-hand/index.ts` | Catch duplicate constraint error (23505) gracefully |
| `src/hooks/useOnlinePokerTable.ts` | Revert timeout polling to leader-only |

## What Does NOT Change

- No UI/layout/navigation/BottomNav changes
- No changes to game logic, pot calculations, or deal animations
- No changes to `poker-action`, `poker-join-table`, `poker-check-timeouts`, `poker-leave-table`
- The 5s server tolerance and 1-timeout auto-kick stay (they're good changes)
- The stale hand recovery calling `poker-check-timeouts` stays (good redundancy)

