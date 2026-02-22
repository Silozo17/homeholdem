

# Fix: Drawer Safe Areas and Close Button in Landscape Mode

## Problem

All Sheet/drawer components share the same base `SheetContent` in `sheet.tsx`, which has two fundamental issues in landscape mode on mobile:

1. **Close button is untappable**: The X button is a bare 16x16 icon with zero padding -- far below the recommended 44x44 minimum tap target. In landscape, it sits right against the screen edge (notch/sensor housing area), making it physically impossible to tap.

2. **Only one safe-area inset is applied per side**: The `safeAreaStyles` map applies `padding-left` for left sheets, `padding-right` for right sheets, etc. But in landscape mode, a left-side sheet also needs `padding-top` (for the notch) and `padding-bottom`. Similarly, right-side sheets need all three. Currently, content gets clipped behind the notch/status bar area.

## Root Cause (in `sheet.tsx`)

```text
safeAreaStyles = {
  left:  { paddingLeft: 'env(safe-area-inset-left)' },   // missing top + bottom
  right: { paddingRight: 'env(safe-area-inset-right)' },  // missing top + bottom
  top:   { paddingTop: 'env(safe-area-inset-top)' },      // missing left + right
  bottom:{ paddingBottom: 'env(safe-area-inset-bottom)' }, // missing left + right
};
```

And the close button:
```text
<SheetPrimitive.Close className="absolute top-4 ..."
  style={{ right: side === 'right' ? 'calc(1rem + env(safe-area-inset-right))' : '1rem' }}>
  <X className="h-4 w-4" />   // 16x16, no padding = untappable
</SheetPrimitive.Close>
```

## Fix (1 file: `src/components/ui/sheet.tsx`)

### Change 1: Apply ALL relevant safe-area insets per side

Replace the single-inset map with comprehensive insets:

| Side   | Padding applied                                    |
|--------|----------------------------------------------------|
| left   | padding-left + padding-top + padding-bottom        |
| right  | padding-right + padding-top + padding-bottom       |
| top    | padding-top + padding-left + padding-right         |
| bottom | padding-bottom + padding-left + padding-right      |

### Change 2: Make close button tappable with proper sizing and positioning

- Add `p-2` (8px padding) around the icon for a ~32x32 tap target (icon 16 + 8+8)
- Position with `safe-area-inset-top` so it clears the notch in landscape
- For left-side sheets, position close button on the right accounting for safe-area-inset-right
- For right-side sheets, keep existing safe-area-inset-right logic

### Change 3: Close button top positioning

Replace fixed `top-4` with `top` calculated as `max(1rem, env(safe-area-inset-top, 0px))` so the button is never hidden behind the notch/status bar.

## What this fixes globally

Since all drawers (PlayerProfileDrawer, HandReplay, NotificationPanel, UserDetailSheet, sidebar) use `SheetContent`, this single fix improves ALL of them at once. No changes needed to any individual drawer component.

## Files changed

- `src/components/ui/sheet.tsx` -- safe-area styles map + close button sizing/positioning

## No other changes

- No changes to PlayerProfileDrawer, HandReplay, NotificationPanel, or any other file
- No changes to layout, navigation, spacing, or behaviour outside the Sheet component
