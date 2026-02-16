

# Fix: Departed Player Remains Visible After Leaving

## Root Cause

In `src/hooks/useOnlinePokerTable.ts`, the `seat_change` broadcast handler (line 201) only calls `refreshState()` — an async HTTP call. It does NOT immediately remove the departed player from local `tableState.seats`. This causes two problems:

1. **Delay**: The player stays visible until the HTTP round-trip completes.
2. **Race condition**: If a `game_state` broadcast arrives before `refreshState()` resolves, it overwrites `seats` with data that may still include the departed player (the broadcast payload is generated at action time, not at the moment the client processes it).

## Fix

Update the `seat_change` handler to **immediately remove the seat from local state** when `action === 'leave'`, using the `seat` number from the payload. Then still call `refreshState()` as a follow-up to ensure full consistency.

### File: `src/hooks/useOnlinePokerTable.ts`

Replace the current `seat_change` handler:

```typescript
// BEFORE (line 201-211):
.on('broadcast', { event: 'seat_change' }, ({ payload }) => {
  if (payload?.action === 'table_closed') {
    setTableState(null);
    return;
  }
  if (payload?.remaining_players === 1 && payload?.action === 'leave') {
    setTableState(prev => prev ? { ...prev } : prev);
  }
  refreshState();
})
```

```typescript
// AFTER:
.on('broadcast', { event: 'seat_change' }, ({ payload }) => {
  if (payload?.action === 'table_closed') {
    setTableState(null);
    return;
  }
  if (payload?.action === 'leave' && payload?.seat != null) {
    // Immediately remove the departed player from local state
    setTableState(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        seats: prev.seats.map(s =>
          s.seat === payload.seat
            ? { ...s, player_id: null, display_name: '', avatar_url: null, stack: 0, status: 'empty', has_cards: false, current_bet: 0, last_action: null }
            : s
        ),
      };
    });
  }
  // Still refresh for full consistency
  refreshState();
})
```

This ensures the departed player vanishes instantly from the UI, regardless of network timing or other broadcasts.

### Summary

| Change | File |
|--------|------|
| Immediately clear departed player's seat in `seat_change` handler | `src/hooks/useOnlinePokerTable.ts` |

One small edit, no new files.
