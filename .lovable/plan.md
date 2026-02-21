

# Fix: Drawers/Sheets Too Close to Screen Edges in Landscape

## Problem

In landscape mode on mobile, the Sheet components (Hand History/Replay, Notifications, Player Profile) render flush against the screen edges. On devices with notches or rounded corners, this makes the close button (X) and content difficult to tap.

## Fix

Add safe-area inset padding to the Sheet component itself (`src/components/ui/sheet.tsx`) so **all** sheets automatically respect device safe areas, rather than patching each individual sheet.

### Changes

**File: `src/components/ui/sheet.tsx`** -- Update the `SheetContent` to include safe-area padding based on the `side` prop:

- **Right side sheets**: Add `padding-right: env(safe-area-inset-right)` and move the close (X) button inward accordingly
- **Left side sheets**: Add `padding-left: env(safe-area-inset-left)`
- **Bottom side sheets**: Add `padding-bottom: env(safe-area-inset-bottom)`
- **Top side sheets**: Add `padding-top: env(safe-area-inset-top)`

The close button position will also be adjusted to account for the right safe-area inset so it remains tappable on notched devices.

### Technical Detail

In `SheetContent`, apply inline `style` with the appropriate safe-area env() values based on the `side` variant:

```typescript
// For right-side sheets:
style={{ paddingRight: 'env(safe-area-inset-right, 0px)' }}
// Close button: right-[calc(1rem+env(safe-area-inset-right,0px))]

// For left-side sheets:
style={{ paddingLeft: 'env(safe-area-inset-left, 0px)' }}
```

| File | Change |
|------|--------|
| `src/components/ui/sheet.tsx` | Add safe-area inset padding to SheetContent and adjust close button position |

## What Does NOT Change

- No changes to individual sheet consumers (HandReplay, NotificationPanel, PlayerProfileDrawer, etc.)
- No layout, navigation, or bottom nav changes
- No database or edge function changes
