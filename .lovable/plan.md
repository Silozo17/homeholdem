

## Two Surgical Fixes

### FIX 1 -- hand_complete showdown delay still hardcoded

**File:** `src/hooks/useOnlinePokerTable.ts`

**Line 564:** Change comment from "Showdown cleanup at 12s" to "Showdown cleanup -- dynamic delay"

**Line 577:** Replace `12000` with `winnerDelay + 4000`

`winnerDelay` is already calculated at line 560 in the same handler, so this is a direct reference.

---

### FIX 2 -- Timer visual resetting on every parent render

**File:** `src/components/poker/OnlinePokerTable.tsx`

**Step A:** Add a `useCallback` near `handleLowTime` (after line 932):

```typescript
const handleTimeout = useCallback(() => {
  handleAction({ type: 'fold' });
  setShowStillPlayingPopup(true);
}, [handleAction]);
```

**Step B:** At lines 1553-1556, replace the inline arrow function:

```typescript
// Before
onTimeout={isMe && isCurrentActor ? () => {
  handleAction({ type: 'fold' });
  setShowStillPlayingPopup(true);
} : undefined}

// After
onTimeout={isMe && isCurrentActor ? handleTimeout : undefined}
```

---

### Technical Summary

| Fix | File | Lines | Change |
|-----|------|-------|--------|
| 1 | useOnlinePokerTable.ts | 564, 577 | `12000` to `winnerDelay + 4000` |
| 2a | OnlinePokerTable.tsx | after 932 | Add `handleTimeout` useCallback |
| 2b | OnlinePokerTable.tsx | 1553-1556 | Use `handleTimeout` ref instead of inline fn |

No other files or lines are touched.

