

# Disable Card Peek + Fix & Reposition Pre-Action Buttons

## 1. Remove Card Peek Feature

Remove the PeekableCard squeeze mechanic entirely. Cards will auto-reveal face-up after the deal animation (existing sequential reveal behaviour).

**Files affected:**
- `OnlinePokerTable.tsx` -- Remove `cardsPeeked` state, stop passing `isPeeked`/`onPeek` to PlayerSeat
- `PlayerSeat.tsx` -- Remove `isPeeked`/`onPeek` props, remove PeekableCard import, always use CardDisplay for human cards
- `PeekableCard.tsx` -- Delete the file (no longer referenced)

## 2. Fix Pre-Action Bug ("Check" auto-called a raise)

The issue: when you queue "Check" and an opponent raises before your turn, there is a race condition where `isMyTurn` fires the pre-action before the bet invalidation effect runs. 

**Fix (in `OnlinePokerTable.tsx`):**
- In the pre-action execution block, add an explicit `amountToCall === 0` guard for the `check` pre-action, so it never fires when there is money to call
- Also guard `check_fold`: use the live `amountToCall` value (not just `canCheck`) to decide fold vs check
- Clear any queued pre-action whenever the table bet level changes (strengthen the existing invalidation)

## 3. Move Pre-Action Buttons to Top-Right, Stacked Vertically

Reposition the pre-action pills from bottom-center to the top-right corner of the screen, stacked vertically.

**Changes:**
- `PreActionButtons.tsx` -- Change layout from horizontal (`flex-row gap-1.5`) to vertical (`flex-col gap-1`)
- `OnlinePokerTable.tsx` -- Change the pre-action container from `absolute left-1/2 -translate-x-1/2 bottom-...` to `absolute top-[calc(safe-area + header)] right-[safe-area + 8px]`, positioned just below the header bar icons

### Technical Detail

**OnlinePokerTable.tsx lines 911-916 (pre-action container):**
```
// FROM: centered at bottom
<div className="absolute left-1/2 -translate-x-1/2" style={{ bottom: '...' }}>

// TO: top-right corner, below header
<div className="absolute" style={{ 
  top: 'calc(env(safe-area-inset-top, 0px) + 48px)', 
  right: 'calc(env(safe-area-inset-right, 0px) + 10px)',
  zIndex: Z.ACTIONS 
}}>
```

**PreActionButtons.tsx layout:**
```
// FROM: horizontal row
<div className="flex items-center justify-center gap-1.5">

// TO: vertical stack
<div className="flex flex-col items-end gap-1">
```

**Pre-action execution fix (OnlinePokerTable.tsx ~line 280):**
```typescript
if (preAction === 'check_fold') {
  actionToFire = amountToCall === 0 ? { type: 'check' } : { type: 'fold' };
} else if (preAction === 'call_any') {
  actionToFire = amountToCall === 0 ? { type: 'check' } : { type: 'call' };
} else if (preAction === 'check') {
  // ONLY fire if there is genuinely nothing to call
  if (amountToCall === 0) actionToFire = { type: 'check' };
  // Otherwise discard silently (do NOT call)
}
```

