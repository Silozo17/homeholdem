

# Fix: Button Positioning Corrections

## Issue 1: Coloured buttons (Fold/Check/Raise) — move 5px to the left

The action buttons in portrait mode are currently at `left: 0, right: 0, px-3`. They appear centered. Moving them 5px to the left means adjusting the padding or adding a slight left offset.

For the landscape/desktop version at line 1236, the buttons use `right: calc(env(safe-area-inset-right, 0px) + 10px)`. Moving 5px left means increasing the right offset to `15px`.

For the mobile landscape version at line 1202-1203, same adjustment: increase `paddingRight` by 5px.

**File: `src/components/poker/OnlinePokerTable.tsx`**
- Line 1203: Change `paddingRight` from `max(env(safe-area-inset-right, 0px), 8px)` to `max(env(safe-area-inset-right, 0px), 13px)`
- Line 1236: Change right from `10px` to `15px`

## Issue 2: Grey pre-action buttons (Check/Fold, Call Any, Check) — move back to top-right

The user originally asked to move these closer to the right edge with 10px padding, NOT to the bottom. They should stay in the **top-right corner** as they were before, just with exactly 10px right padding.

**File: `src/components/poker/OnlinePokerTable.tsx`**
- Line 1248: Change positioning from `bottom: calc(env(safe-area-inset-bottom, 0px) + 12px)` back to `top: calc(env(safe-area-inset-top, 0px) + 48px)`, keep `right: calc(env(safe-area-inset-right, 0px) + 10px)`

## Summary

| File | Line | Change |
|------|------|--------|
| `OnlinePokerTable.tsx` | 1203 | Increase paddingRight by 5px (8px to 13px) for mobile landscape action buttons |
| `OnlinePokerTable.tsx` | 1236 | Increase right offset by 5px (10px to 15px) for desktop landscape action buttons |
| `OnlinePokerTable.tsx` | 1248 | Change pre-action buttons from `bottom` back to `top: calc(env(safe-area-inset-top, 0px) + 48px)` |

