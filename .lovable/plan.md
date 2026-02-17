

# Fix: Handle Player Dropouts Without Freezing the Game

## Problem

When a player minimizes their phone and can't return, the game freezes for everyone. The current timeout system has several gaps:

1. **The 20s turn timer** only exists visually on clients -- the server relies on other clients to report it
2. **The timeout ping** only fires from non-actor clients 2s after deadline, but if the disconnected player IS the leader (lowest seat), no one polls the server
3. **The server check** (`poker-check-timeouts`) requires a client to call it AND waits 10s past deadline before acting -- total worst-case: 30+ seconds of apparent freeze
4. **No redundancy** -- if the leader disconnects, the backup (stale hand recovery at 12s) only calls `refreshState`, not `poker-check-timeouts`

## Solution: Multi-Layer Dropout Protection

### Layer 1: ALL seated players poll for timeouts (not just leader)

**File:** `src/hooks/useOnlinePokerTable.ts` (lines 607-628)

Currently only the "auto-start leader" (lowest-seated player) runs the 8s timeout poll. Change this so ALL seated players poll, but stagger them:
- Leader polls every 8s (unchanged)
- Non-leader seated players poll every 12s with a random offset

This ensures if the leader is the one who disconnected, other players still trigger the server-side timeout check.

### Layer 2: Reduce server timeout tolerance from 10s to 5s

**File:** `supabase/functions/poker-check-timeouts/index.ts` (line 47)

Change the cutoff from 10 seconds to 5 seconds past deadline. Combined with the 20s turn timer, the total wait becomes 25s instead of 30s. This is still safe against clock skew while being more responsive.

```
// BEFORE:
const cutoff = new Date(Date.now() - 10_000).toISOString();

// AFTER:
const cutoff = new Date(Date.now() - 5_000).toISOString();
```

### Layer 3: Stale hand recovery should trigger timeout check, not just refresh

**File:** `src/hooks/useOnlinePokerTable.ts` (lines 581-592)

Currently when 12s passes with no broadcast, `refreshState()` is called. But if the hand is stuck because of a timed-out player, refreshing state just shows the same stuck state. Add a `poker-check-timeouts` call before the refresh:

```typescript
if (elapsed > 12000) {
  lastBroadcastRef.current = Date.now();
  callEdge('poker-check-timeouts', { table_id: tableId }).catch(() => {});
  refreshState();
}
```

### Layer 4: Auto-kick disconnected players after 1 timeout (down from 2)

**File:** `supabase/functions/poker-check-timeouts/index.ts` (line 375)

Change the consecutive timeout threshold from 2 to 1. If a player times out once (their 20s turn expires + 5s server grace), they are immediately kicked from the table. This prevents the scenario where a disconnected player causes TWO hands to freeze before being removed.

```
// BEFORE:
.gte("consecutive_timeouts", 2)

// AFTER:
.gte("consecutive_timeouts", 1)
```

This is aggressive but appropriate -- a player who missed their entire 20s turn is very likely disconnected. Real players who briefly lag will act within the 20s window.

## Summary of Changes

| File | Change |
|------|--------|
| `src/hooks/useOnlinePokerTable.ts` (line 609) | All seated players poll for timeouts (not just leader) |
| `src/hooks/useOnlinePokerTable.ts` (line 586) | Stale hand recovery triggers `poker-check-timeouts` too |
| `supabase/functions/poker-check-timeouts/index.ts` (line 47) | Reduce tolerance from 10s to 5s |
| `supabase/functions/poker-check-timeouts/index.ts` (line 375) | Auto-kick after 1 timeout instead of 2 |

## Worst-Case Timeline (After Fix)

```text
0s     - Player's turn starts (20s timer)
20s    - Turn timer expires, action_deadline passes
22s    - Non-actor client fires poker-timeout-ping (auto-fold)
25s    - If ping failed: server check triggers (5s tolerance)
25s    - Disconnected player auto-kicked (1 timeout = kick)
27s    - Next hand auto-starts
```

Compare to current worst case: 30-40s freeze, player stays for a SECOND hand freeze, then kicked.

## What Does NOT Change

- No UI/layout/navigation changes
- No database schema changes
- No changes to the 20s turn timer duration
- No changes to game logic, pot calculations, or deal animations
- No BottomNav changes
- `poker-action`, `poker-start-hand`, `poker-leave-table` unchanged

