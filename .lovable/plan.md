

# Fix: Active Player Count Always Reflects True Players

## Problem
The lobby counts ALL rows in `poker_seats` for each table, including seats with status `sitting_out`, `left`, or other non-active states. This shows incorrect (stale) player counts, especially after players leave.

## Solution
Add a status filter to the seat count query so it only counts seats where the player is actively playing.

## Technical Detail

**File:** `src/components/poker/OnlinePokerLobby.tsx`

**Lines 86-89** -- add `.in('status', ['active', 'sitting_out'])` to the seats query to only count players who are actually present at the table (both active and sitting-out players are "at" the table; players who busted or left are not).

Before:
```typescript
const { data: seats } = await supabase
  .from('poker_seats')
  .select('table_id')
  .in('table_id', tableIds.length > 0 ? tableIds : ['none']);
```

After:
```typescript
const { data: seats } = await supabase
  .from('poker_seats')
  .select('table_id')
  .in('table_id', tableIds.length > 0 ? tableIds : ['none'])
  .in('status', ['active', 'sitting_out']);
```

The realtime subscription already triggers `fetchTables()` on any `poker_seats` change (line 113), so live updates and refresh both work -- they just need the correct filter.

## Files Changed

| File | Change |
|------|--------|
| `src/components/poker/OnlinePokerLobby.tsx` | Add status filter to seat count query |

