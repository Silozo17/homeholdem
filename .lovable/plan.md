

# Fix Learn Poker Page Header Overlap on Mobile

## Problem
The content (BookOpen icon) is cut off behind the fixed header on mobile. The spacer div has `h-14 safe-area-top`, but `h-14` sets an explicit height of 56px. The `safe-area-top` class adds `padding-top`, which does NOT increase the element beyond its fixed 56px height. Meanwhile, the header is 56px + safe-area-inset-top tall, so the spacer is too short.

## Fix
Change the spacer from a fixed-height div to one that accommodates both the header height and safe area inset. Replace `h-14` with `pt-14` so the safe-area padding stacks on top of the 56px.

**File: `src/pages/LearnPoker.tsx` (line 167)**

Change:
```html
<div className="h-14 safe-area-top shrink-0" aria-hidden="true" />
```

To:
```html
<div className="pt-14 safe-area-top shrink-0" aria-hidden="true" />
```

Using `pt-14` (padding-top: 3.5rem) combined with `safe-area-top` (padding-top: env(safe-area-inset-top)) means the element's total size = 56px + safe-area-inset, correctly matching the header.

## Files Changed

| File | Change |
|------|--------|
| `src/pages/LearnPoker.tsx` | Line 167: change spacer from `h-14` to `pt-14` |

## Not Changed
- No other files, styles, navigation, or layout affected.
