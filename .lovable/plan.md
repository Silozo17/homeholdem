
# Fix: Check Button Not Visible During Tutorial

## Root Cause

The `CoachOverlay` component renders a full-screen semi-transparent dark backdrop (`bg-black/25` at `z-50`) that sits ON TOP of the betting controls.

Here is the stacking order:
- `LearnPoker.tsx` wraps `PokerTablePro` in a `div` with `z-10` (line 136)
- Inside `PokerTablePro`, the action buttons are at `z-[50]` (Z.ACTIONS)
- Because the `z-10` wrapper creates a stacking context, the buttons' effective z-index in the page is capped at `10`
- `CoachOverlay` renders as a sibling OUTSIDE that `z-10` wrapper, with its dim overlay at `z-50`
- Result: the dim overlay (`bg-black/25`) renders visually ON TOP of the action buttons

During `require_action` steps (like "Tap Check"), the overlay sets `pointer-events-none` so taps pass through -- but the 25% black layer still renders over the already-dark buttons, making them nearly invisible on the dark poker table background, especially on smaller screens like iPhone 12.

## Fix (smallest possible change)

**File: `src/components/poker/CoachOverlay.tsx`**

During `require_action` steps (`isRequireAction` is true), hide the dim backdrop entirely instead of just making it `pointer-events-none`. The coach bubble and pointer hand are still visible and guide the user, but the buttons underneath are no longer dimmed by the overlay.

Change the dim overlay from:
```
className="fixed inset-0 bg-black/25 pointer-events-none"
```
to:
```
className="fixed inset-0 bg-black/25 pointer-events-none hidden"
```

Specifically, add a conditional: when `isRequireAction` is true, the backdrop div gets `hidden` (or `opacity-0`) so it does not visually cover the buttons.

This is a one-line change in the `cn()` class on the dim overlay div.

## What does NOT change
- Button positioning, size, spacing, height
- Layout, navigation, z-index values
- CoachOverlay bubble positioning or pointer hands
- Any other component or page
