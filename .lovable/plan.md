
# Fix: Safe-area top padding on /tournaments page

## Problem
The `/tournaments` page header spacer div uses `className="h-14 safe-area-top"` which doesn't work correctly on notched devices. Because Tailwind uses `box-sizing: border-box`, the `h-14` (3.5rem) swallows the safe-area padding instead of adding to it. This is the same pattern that was fixed on other screens.

## Fix (1 file, 1 line)

**File: `src/pages/PaidTournaments.tsx`** (~line 119)

Replace the spacer div:
```tsx
// Before
<div className="h-14 safe-area-top shrink-0" />

// After
<div className="shrink-0" style={{ height: 'calc(3.5rem + env(safe-area-inset-top, 0px))' }} />
```

This matches the pattern used on all other screens with fixed headers, ensuring content doesn't overlap with the status bar or notch on iOS/Android PWA.

No other files or changes required.
