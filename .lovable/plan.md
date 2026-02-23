

# Fix: Remove Base Sheet Top Padding (1 file only)

## Root Cause

`env(safe-area-inset-top)` is orientation-aware by the browser itself:
- **Portrait**: ~47px (status bar)
- **Landscape**: ~0px (notch is on the side, not top)

Currently TWO layers add this value:
1. Base `sheet.tsx` safeAreaStyles: `calc(env(safe-area-inset-top) + 0.5rem)`
2. Each drawer's header: `calc(env(safe-area-inset-top) + 1rem)`

In landscape: 0 + 0 = 0 + normal padding = looks great.
In portrait: 47px + 47px = 94px + normal padding = massive gap.

## Fix: `src/components/ui/sheet.tsx`

Set `paddingTop: 0` for all four sides in `safeAreaStyles`. The individual drawer headers already handle the safe-area top offset correctly for both orientations.

Also update the default close button top position from `max(1rem, env(safe-area-inset-top))` to just `1rem`, since the sheet no longer adds base top padding and drawers that use the default close button have their own header spacing.

### What stays the same
- Side padding: 20% of safe-area (untouched)
- Bottom padding: 0 (untouched)
- Individual drawer headers: untouched (they keep their own `env(safe-area-inset-top) + 1rem`)
- No changes to any other file

## Result

| Orientation | Base sheet top | Header top | Total |
|------------|---------------|-----------|-------|
| Portrait | 0 | ~47px + 1rem | ~63px (correct) |
| Landscape | 0 | ~0px + 1rem | ~16px (correct, same as now) |

## Technical detail

Only `src/components/ui/sheet.tsx` is changed:
- Lines 60, 72, 78: change `paddingTop` from `calc(env(safe-area-inset-top, 0px) + 0.5rem)` to `0`
- Line 89: update close button `top` from `max(1rem, env(safe-area-inset-top, 0px))` to `1rem`

No changes to HandReplay, NotificationPanel, UserDetailSheet, layout, navigation, or bottom nav.

