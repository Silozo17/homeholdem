

# Fix: HandReplay Padding + Remove CSV, NotificationPanel Buttons

## What the admin drawer does right (the reference)

The admin `UserDetailSheet` uses this pattern:
- `SheetContent`: `className="w-full sm:max-w-md p-0 [&>button]:hidden"` -- no custom padding overrides, hides default close button
- Custom close button in the header: `Button variant="ghost" size="icon" onClick={onClose}` with an `X` icon at `h-5 w-5`
- Header top padding: `pt-[calc(env(safe-area-inset-top)+1rem)]`
- No extra right/left padding on `SheetContent` -- lets the base sheet handle safe-area

## File 1: `src/components/poker/HandReplay.tsx`

### Change 1: Remove the right padding override
Line 81 has `pr-[calc(5px+env(safe-area-inset-right,0px))]` which overrides the base sheet's 20% padding with the FULL safe-area inset (~49px). Remove this so the base sheet's padding applies evenly to both sides.

### Change 2: Remove CSV export entirely
- Remove `onExportCSV` from the props interface (line 15)
- Remove `onExportCSV` from the destructured props (line 18)
- Remove the `handleExportCSV` function (lines 63-73)
- Remove the CSV button from the JSX (lines 89-93)
- Remove `Download` from the lucide import (line 6)

### Change 3: Match admin drawer pattern -- add custom close button
- Add `[&>button]:hidden` to SheetContent to hide the default close button
- Add `p-0` to SheetContent className
- Add a custom close button in the SheetHeader, matching admin's pattern (`Button variant="ghost" size="icon"`)
- Use `pt-[calc(env(safe-area-inset-top)+1rem)]` on the header for proper top spacing

## File 2: `src/components/notifications/NotificationPanel.tsx`

This drawer already hides the default close button and has its own, but the custom close button is too small (`h-8 w-8`) and the "Mark all read" button is too small (`h-8`).

### Change 1: Match admin drawer header pattern
- Update header padding to use `pt-[calc(env(safe-area-inset-top)+1rem)]` (matching admin) instead of `pt-6`
- Increase custom close button from `h-8 w-8` to `h-10 w-10` with icon at `h-5 w-5` (matching admin)
- Increase "Mark all read" button from `h-8` to `h-10 px-3`

### Change 2: Remove `SheetClose` wrapper
The custom close button currently uses `SheetClose asChild` which wraps the button. Replace with a plain `Button` that calls `onOpenChange(false)` directly (like admin does with `onClose`), removing the `SheetClose` import.

## File 3: `src/components/poker/OnlinePokerTable.tsx`

Remove the `onExportCSV={exportCSV}` prop from the `HandReplay` usage (line 1773), since the prop no longer exists.

## Summary

| File | Change |
|------|--------|
| `src/components/poker/HandReplay.tsx` | Remove pr override + CSV export, add admin-style close button and header padding |
| `src/components/notifications/NotificationPanel.tsx` | Match admin header padding, enlarge close + mark-all-read buttons, remove SheetClose |
| `src/components/poker/OnlinePokerTable.tsx` | Remove onExportCSV prop from HandReplay usage |

No changes to sheet.tsx, layout, navigation, or bottom nav.

