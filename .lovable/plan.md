
# Plan: Fix All-Time Leaderboard to Include Live Game Payouts

## Problem Summary

The All-Time Leaderboard shows £1,750 for Kryniu instead of £2,010 (or £2,013 exact). This is because:

1. **The Leaderboard only queries `payout_structures` table** (lines 104-108)
2. **Jan 2026 game payouts are stored in `game_transactions` table** (not payout_structures)
3. Historical games (pre-2026) used `payout_structures` for winner data
4. Live games (Jan 2026+) use `game_transactions` with `transaction_type = 'payout'`

### Current Data Sources

| Table | Sessions | Used For |
|-------|----------|----------|
| `payout_structures` | 23 historical games | Winner payouts (pre-2026 imports) |
| `game_transactions` | 1 live game (Jan 2026) | Buy-ins, rebuys, and payouts |

### Expected Totals (Example: Kryniu)

| Source | Amount |
|--------|--------|
| payout_structures | £1,753 |
| game_transactions | £260 (currently stored as £259) |
| **Expected Total** | **£2,013** |
| **Currently Showing** | **£1,750** |

---

## Solution

### 1. Database Fix: Correct Jan 2026 Transaction Amounts

First, fix the slightly incorrect payout values:

```sql
-- Fix Kryniu's payout (should be £260, not £259)
UPDATE game_transactions
SET amount = -260
WHERE id = '73387edd-8f34-4938-814d-234f9883747c';

-- Fix Puchar's payout (should be £220, not £221)
UPDATE game_transactions
SET amount = -220
WHERE id = '0fd44276-4af5-4434-b270-5f1f9a106681';
```

### 2. Code Fix: Query Both Tables for Winnings

Modify `Leaderboard.tsx` to also fetch winnings from `game_transactions`:

**File: `src/components/clubs/Leaderboard.tsx`**

After the existing payout_structures query (line 104-108), add a query for game_transactions:

```typescript
// Get payouts from payout_structures (historical data)
const { data: payouts } = await supabase
  .from('payout_structures')
  .select('player_id, amount')
  .in('game_session_id', sessionIds)
  .not('player_id', 'is', null);

// ALSO get payouts from game_transactions (live games)
const { data: transactionPayouts } = await supabase
  .from('game_transactions')
  .select('game_player_id, amount')
  .in('game_session_id', sessionIds)
  .eq('transaction_type', 'payout');
```

Then merge both sources into the payoutMap:

```typescript
// Create a map from game_player.id to payout amount
const payoutMap = new Map<string, number>();

// Add from payout_structures (historical)
payouts?.forEach(p => {
  if (p.player_id && p.amount) {
    payoutMap.set(p.player_id, (payoutMap.get(p.player_id) || 0) + p.amount);
  }
});

// Add from game_transactions (live games) - amounts are negative
transactionPayouts?.forEach(t => {
  if (t.game_player_id && t.amount) {
    // Payouts are stored as negative values in game_transactions
    const payoutAmount = Math.abs(t.amount);
    payoutMap.set(t.game_player_id, (payoutMap.get(t.game_player_id) || 0) + payoutAmount);
  }
});
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/clubs/Leaderboard.tsx` | Add query for `game_transactions` payouts, merge with payout_structures data |
| Database | Fix Jan 2026 payout amounts (£260 and £220) |

---

## Expected Results After Fix

| Player | Historical | Jan 2026 | Total |
|--------|-----------|----------|-------|
| Kryniu | £1,753 | +£260 | £2,010 (rounded) |
| Puchar | £600 | +£220 | £820 |

The leaderboard will now show accurate, live stats that update immediately when games are finalized.

---

## Technical Notes

- The convention is that `game_transactions` stores payout amounts as **negative values** (per memory context)
- The fix uses `Math.abs()` to convert these to positive amounts for display
- This ensures all future live games will automatically update the leaderboard
