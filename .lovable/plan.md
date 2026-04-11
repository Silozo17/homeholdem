

# Fix: Deal Hand Button Not Appearing on Community Tables

## Root Cause

In `useOnlinePokerTable.ts` line 135, `handHasEverStarted` is set to `true` when `data.table?.status === 'waiting'`. Community tables always have status `'waiting'` when no hand is active. So when two players join and load the table, `handHasEverStarted` immediately becomes `true`.

The Deal Hand button (line 961 of `OnlinePokerTable.tsx`) requires `!handHasEverStarted`, so it's permanently hidden — players can never start the first hand.

This was introduced in the recent sync fix to help rejoining players trigger auto-start, but it breaks the initial manual deal for any table in `waiting` status.

## Fix

**File: `src/hooks/useOnlinePokerTable.ts`**, line 135

Remove the `data.table?.status === 'waiting'` condition. Only set `handHasEverStarted` to `true` when there's an actual `current_hand` or the table status is `'playing'` (meaning a hand has genuinely been dealt before):

```typescript
// Before:
if (data.current_hand || data.table?.status === 'waiting') {
  setHandHasEverStarted(true);
}

// After:
if (data.current_hand || data.table?.status === 'playing') {
  setHandHasEverStarted(true);
}
```

This way:
- Fresh community table (`waiting`, no hand): `handHasEverStarted` stays `false` → Deal Hand button shows
- Table mid-hand (`playing`, has hand): `handHasEverStarted` becomes `true` → auto-start takes over
- Player rejoins after a hand was played (`playing`, no current hand between rounds): `handHasEverStarted` becomes `true` → auto-start works

One file, one line changed.

