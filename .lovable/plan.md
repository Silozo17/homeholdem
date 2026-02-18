

# Fix Learn Poker Header Overlap -- Match PokerHub Pattern Exactly

## Problem
The last edit changed `h-14` to `pt-14`, but both `pt-14` and `safe-area-top` set `padding-top`, so Tailwind's `pt-14` overrides the safe-area value entirely. This made the spacer ignore the notch inset.

## Fix
Revert the spacer to match PokerHub's exact working pattern on line 35 of `PokerHub.tsx`:

**File: `src/pages/LearnPoker.tsx` (line 167)**

Change:
```html
<div className="pt-14 safe-area-top shrink-0" aria-hidden="true" />
```

To:
```html
<div className="h-14 safe-area-top shrink-0" />
```

This is character-for-character identical to PokerHub line 35, which works correctly on mobile. `h-14` sets the height (does not conflict with padding-top from `safe-area-top`), and `shrink-0` prevents flex compression.

## Files Changed

| File | Change |
|------|--------|
| `src/pages/LearnPoker.tsx` | Line 167: revert spacer to exact PokerHub pattern `h-14 safe-area-top shrink-0` |

## Not Changed
- No other files touched

