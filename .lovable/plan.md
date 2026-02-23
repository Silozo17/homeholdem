

# Fix: Drawer Padding and Button Clickability in Landscape

## Problem (from screenshots)

1. **Right padding too large**: `env(safe-area-inset-right)` is ~44px on landscape iPhones, creating a huge dead zone on right-side drawers
2. **Left drawers mirror issue**: Same excessive padding on the left inset side
3. **Bottom padding unnecessary**: Drawers don't need bottom safe-area padding at all
4. **Top padding too small**: Content sits too close to notch/status bar
5. **Buttons broken**: Close button and interactive elements inside drawers are untappable

## Root Cause (in `src/components/ui/sheet.tsx`)

The `safeAreaStyles` applies full `env(safe-area-inset-*)` values. In landscape, these are massive (44px+). The close button also lacks sufficient z-index to sit above content, and may be overlapped by the safe-area padding zone.

## Fix (1 file: `src/components/ui/sheet.tsx`)

### Change 1: Reduce side padding to 20%, remove bottom, increase top

Replace the `safeAreaStyles` object (lines 56-77):

| Side | paddingLeft | paddingRight | paddingTop | paddingBottom |
|------|-------------|--------------|------------|---------------|
| right | 0 | `calc(env(safe-area-inset-right) * 0.2)` | `calc(env(safe-area-inset-top) + 0.5rem)` | 0 |
| left | `calc(env(safe-area-inset-left) * 0.2)` | 0 | `calc(env(safe-area-inset-top) + 0.5rem)` | 0 |
| top | `calc(env(safe-area-inset-left) * 0.2)` | `calc(env(safe-area-inset-right) * 0.2)` | `calc(env(safe-area-inset-top) + 0.5rem)` | 0 |
| bottom | `calc(env(safe-area-inset-left) * 0.2)` | `calc(env(safe-area-inset-right) * 0.2)` | 0 | 0 |

### Change 2: Fix close button clickability

- Add `z-[60]` to ensure it sits above all sheet content
- Add `pointer-events-auto` to guarantee it captures taps
- Increase tap target: change `p-2` to `p-3` (44x44 minimum touch target)
- Update right offset to use the reduced 20% safe-area value to match the new padding
- Keep `top: max(1rem, env(safe-area-inset-top))` for notch clearance

### Change 3: Ensure inner content doesn't block buttons

- Add `relative z-0` to the children wrapper area (if needed) so the close button's `z-[60]` always wins

## Files changed

| File | Change |
|------|--------|
| `src/components/ui/sheet.tsx` | Update safeAreaStyles (20% side, no bottom, more top), fix close button z-index + pointer-events + tap size |

No other files changed. No changes to layout, navigation, spacing, or behaviour outside the Sheet component.

