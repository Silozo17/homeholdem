

# Plan: Fix Jan 2026 Season 3 Winnings Data

## Problem

The Season 3 standings are showing £0 for winnings because the data was manually inserted with incorrect values. The correct amounts are:

- **Kryniu** (1st place): £260 won
- **Puchar** (2nd place): £220 won
- **Total**: £480 (matches the prize pool override)

The game_transactions table also has slightly incorrect payout values (£259 and £221 instead of £260 and £220).

## Solution

### Database Updates Required

**1. Fix Season Standings Winnings:**

| Player | Standing ID | Correct Winnings |
|--------|-------------|------------------|
| Kryniu | e98bbeef-f41a-47c9-af1c-f11d5e3d215b | £260 |
| Puchar | 7177a47d-feb2-49ca-83e0-b487b6db94b8 | £220 |

```sql
-- Fix Kryniu's winnings (1st place: £260)
UPDATE season_standings 
SET total_winnings = 260
WHERE id = 'e98bbeef-f41a-47c9-af1c-f11d5e3d215b';

-- Fix Puchar's winnings (2nd place: £220)
UPDATE season_standings 
SET total_winnings = 220
WHERE id = '7177a47d-feb2-49ca-83e0-b487b6db94b8';
```

**2. (Optional) Fix Game Transactions:**

If you want the transaction history to be accurate as well:

```sql
-- Fix Kryniu's payout transaction (£260)
UPDATE game_transactions
SET amount = -260
WHERE id = '73387edd-8f34-4938-814d-234f9883747c';

-- Fix Puchar's payout transaction (£220)
UPDATE game_transactions
SET amount = -221
WHERE id = '0fd44276-4af5-4434-b270-5f1f9a106681';
```

## Files to Modify

None - this is a data-only fix.

## Expected Results

After the fix, Season 3 standings will show:

| Player | Points | Winnings |
|--------|--------|----------|
| Kryniu | 11 pts | £260 won |
| Puchar | 8 pts | £220 won |
| Breku | 6 pts | £0 won |
| Others | 1-4 pts | £0 won |

