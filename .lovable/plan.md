

# Fix: Double-Click on Seat Causes "Already Seated" Error

## Problem

When a user clicks a seat to join, the server creates the seat record but the client doesn't visually update fast enough (or at all). The user clicks again and gets "Already seated at this table" because the server already has them seated from the first click.

Two issues:
1. The `joining` flag is set but never passed to `EmptySeatDisplay`, so the seat button remains clickable during the async join call
2. When the "Already seated" error occurs, the UI should just refresh its state (since the seat was successfully taken on the first attempt) instead of showing an error

## Fix

**File: `src/components/poker/OnlinePokerTable.tsx`**

### Change 1: Pass `joining` to disable empty seats during join

Update the `EmptySeatDisplay` render to disable joins while the request is in flight:

```typescript
<EmptySeatDisplay
  seatNumber={actualSeatNumber}
  canJoin={!isSeated && !joining}
  onJoin={() => handleJoinSeat(actualSeatNumber)}
/>
```

### Change 2: Handle "Already seated" gracefully

In `handleJoinSeat`, catch the specific "Already seated" error and call `refreshState()` to sync the UI instead of showing an error toast:

```typescript
const handleJoinSeat = async (seatNum: number) => {
  if (joining) return;
  setJoining(true);
  try {
    await joinTable(seatNum, table.max_buy_in);
    toast({ title: 'Seated!' });
  } catch (err: any) {
    const msg = err?.message || '';
    if (msg.includes('Already seated')) {
      // First click succeeded server-side; just sync UI
      await refreshState();
      toast({ title: 'Seated!' });
    } else {
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    }
  } finally {
    setJoining(false);
  }
};
```

| File | Change |
|------|--------|
| `src/components/poker/OnlinePokerTable.tsx` | Add early return + pass `joining` to disable seats during request; handle "Already seated" error gracefully with `refreshState()` |

## What Does NOT Change

- No edge function changes
- No changes to `useOnlinePokerTable.ts`
- No style, layout, or navigation changes
- No changes to the bottom navigation
