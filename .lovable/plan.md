

# Fix: Content Hidden Behind Bottom Navigation

## Problem

The bottom navigation bar is `h-16` (64px) + `pb-[5px]` (5px) + `safe-area-bottom` (up to ~34px on iPhones with home indicator) = up to ~103px total height.

However, the main content wrapper in `AppLayout.tsx` only applies `pb-20` (80px) of bottom padding. This means on devices with a safe-area inset, the last ~23px of content is hidden behind the nav bar and users cannot scroll to see it.

## Fix

**File: `src/components/layout/AppLayout.tsx`** (line 55)

Change the bottom padding from a fixed `pb-20` to a value that accounts for the safe-area inset:

```
// Before
showBottomNav ? 'pb-20' : ''

// After  
showBottomNav ? 'pb-24' : ''
```

Additionally, add an inline style to include the device safe-area inset on top of the Tailwind padding, ensuring the content clears the nav on all devices:

```tsx
style={showBottomNav ? { paddingBottom: 'calc(6rem + env(safe-area-inset-bottom, 0px))' } : undefined}
```

This ensures:
- Base padding of `6rem` (96px) covers the nav height (64px + 5px + margin)
- `env(safe-area-inset-bottom)` adds the device-specific home indicator area
- No changes to BottomNav or any other component

## Summary

| File | Line | Change |
|------|------|--------|
| `AppLayout.tsx` | 55 | Replace `pb-20` class with inline `paddingBottom: calc(6rem + env(safe-area-inset-bottom, 0px))` |

