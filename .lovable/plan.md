

# Reduce Multiplayer Poker Freezes

## Root Cause Analysis

From the logs and code, the freezes stem from **three overlapping issues**:

### 1. Redundant polling storms (client-side)
The client runs **three overlapping timers** that all hit the server simultaneously:
- **Heartbeat**: every 30s (`poker-heartbeat`)
- **Stale hand recovery**: every 5s checks if no broadcast in 12s, then calls `poker-check-timeouts` + `refreshState` sequentially
- **Leader timeout poll**: every 8s calls `poker-check-timeouts` + `refreshState`

When the stale recovery and leader poll overlap (which they do frequently), the client fires 2x `check-timeouts` + 2x `refreshState` = 4 HTTP requests in rapid succession. Each causes a React state update, leading to a visible freeze.

### 2. Broadcast REST fallback (server-side)
Every edge function logs: `"Realtime send() is automatically falling back to REST API"`. The Supabase SDK's `channel.send()` is falling back to a slower REST delivery path. This adds latency between a player acting and others seeing the update.

### 3. Sequential DB queries in edge functions (server-side)
After each action, `poker-action` runs 3 sequential queries before broadcasting: `commit_poker_state` RPC, then `profiles` fetch, then `poker_hole_cards` fetch. These run one after another, adding ~100-200ms total.

## Fixes

### Fix 1: Merge redundant client polling into one timer
Replace the two overlapping poll intervals (stale hand recovery at 5s + leader timeout poll at 8s) with a **single 8s interval** that handles both cases. This halves the number of background HTTP calls.

**File: `src/hooks/useOnlinePokerTable.ts`**
- Remove the standalone stale hand recovery interval (lines 665-678)
- Expand the leader timeout poll (lines 694-714) to also cover the stale broadcast detection
- Non-leaders keep a single 15s fallback `refreshState` instead of the aggressive 5s poll

### Fix 2: Debounce `refreshState` calls
Add a debounce guard so multiple rapid `refreshState` calls (e.g. from seat_change + timeout poll) collapse into one.

**File: `src/hooks/useOnlinePokerTable.ts`**
- Add a `lastRefreshRef` timestamp
- Skip `refreshState` if called within 2s of the last one

### Fix 3: Parallelize post-commit queries in edge functions
Run the `profiles` fetch and `poker_hole_cards` fetch in parallel using `Promise.all` instead of sequentially.

**Files:**
- `supabase/functions/poker-action/index.ts` (lines 622-629)
- `supabase/functions/poker-start-hand/index.ts` (profile fetch section)
- `supabase/functions/poker-check-timeouts/index.ts` (profile + hole card fetches)

### Fix 4: Use `httpSend()` for broadcasts
Replace `channel.send()` with `channel.send()` using the REST-explicit path to avoid the deprecation warning and potential future breakage. The SDK recommends `httpSend()`.

**Files:**
- `supabase/functions/poker-action/index.ts`
- `supabase/functions/poker-start-hand/index.ts`
- `supabase/functions/poker-check-timeouts/index.ts`

---

## Summary of Changes

| File | Change | Impact |
|------|--------|--------|
| `src/hooks/useOnlinePokerTable.ts` | Merge 2 polling intervals into 1; add refreshState debounce | Halves background HTTP calls, reduces React re-render storms |
| `supabase/functions/poker-action/index.ts` | Parallelize profile + hole card queries | ~100ms faster broadcasts |
| `supabase/functions/poker-start-hand/index.ts` | Parallelize profile fetch | ~50ms faster hand start |
| `supabase/functions/poker-check-timeouts/index.ts` | Parallelize profile + hole card queries | ~100ms faster timeout resolution |

## What Is NOT Changed
- Bottom navigation, UI components, game logic, RLS policies
- No new tables or schema changes
- No changes to betting controls, seat layout, or visual components

