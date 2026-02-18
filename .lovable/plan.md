

# Fix Learn Poker Header Overlap — Correct Spacer Height

## Root Cause (for real this time)

Tailwind uses `box-sizing: border-box` by default. When the spacer has `h-14 safe-area-top`:
- `h-14` = total height locked to 56px
- `safe-area-top` = `padding-top: env(safe-area-inset-top)` — this padding is **inside** the 56px, not added on top

So the spacer is always 56px. But the fixed header is 56px (content) + safe-area-inset-top (padding) = taller than 56px. Content slides behind the header by exactly the safe-area-inset amount.

(PokerHub likely has the same subtle overlap but it's less visible because the CardFan hero element has built-in top spacing.)

## Fix

Replace the CSS class-based spacer with an inline style that correctly sums both values:

**File: `src/pages/LearnPoker.tsx` (line 167)**

```html
<!-- Before -->
<div className="h-14 safe-area-top shrink-0" />

<!-- After -->
<div className="shrink-0" style={{ height: 'calc(3.5rem + env(safe-area-inset-top, 0px))' }} />
```

This makes the spacer height = 56px + safe-area-inset-top, exactly matching the header's total visual height. No CSS conflicts, no overrides.

## Files Changed

| File | Change |
|------|--------|
| `src/pages/LearnPoker.tsx` | Line 167: use inline calc() for spacer height |

## Not Changed
- No other files, navigation, layout, or styles touched.
