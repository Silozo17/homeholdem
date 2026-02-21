

# Fix: End Game Overlay Rendering Behind Header & Quick Actions

## Problem

The XPLevelUpOverlay (end game screen) is rendered **inside** the table container element (around line 1280) which has `containerType: 'size'`. This CSS property creates a new stacking context, meaning the overlay's `z-[100]` only applies within that container -- it cannot compete with elements outside it like the header bar (`Z.HEADER = 40`) and PreActionButtons (`Z.ACTIONS = 50`) which sit at the root level of the `z-[60]` wrapper.

That is why the "Check/Fold", "Call Any", "Check" buttons and the top icons (volume, chat, etc.) render on top of the end game screen.

## Fix

Move the XPLevelUpOverlay rendering from inside the table container to the root level of the `z-[60]` wrapper div -- right next to where the header and PreActionButtons are rendered. This puts it in the same stacking context, where its `z-[100]` will correctly sit above `Z.HEADER (40)` and `Z.ACTIONS (50)`.

## Technical Details

**File: `src/components/poker/OnlinePokerTable.tsx`**

1. Cut the XPLevelUpOverlay block (lines 1397-1436) from inside the table container
2. Paste it after the PreActionButtons section (after line 1601), at the root level of the `z-[60]` div
3. No changes to the overlay itself -- its `fixed inset-0 z-[100]` will now work correctly since it is no longer trapped inside the container stacking context

| File | Change |
|------|--------|
| `src/components/poker/OnlinePokerTable.tsx` | Move XPLevelUpOverlay rendering from inside table container to root level of the main wrapper |

## What Does NOT Change

- No changes to XPLevelUpOverlay component itself
- No z-index value changes
- No style, layout, or navigation changes
- No database or edge function changes

