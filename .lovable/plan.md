

# Fix Game Over Stats Screen for Both Orientations

## Problem
1. The Game Over overlay (`WinnerOverlay`) uses a fixed vertical layout (`max-w-sm`, tall card with stacked sections) that doesn't fit well in landscape mode -- content overflows or gets cut off.
2. When the user rotates to portrait to read the stats, the "Rotate Your Device" blocker in `PokerTablePro` (z-index 9999) covers everything, making the stats unreadable in any orientation.

## Solution

### 1. Disable the landscape lock when game is over (`PokerTablePro.tsx`)
- When the game state is `game_over`, skip rendering the "Rotate Your Device" portrait-block overlay so the user can view the stats screen in portrait mode comfortably.
- The `WinnerOverlay` already renders at `z-50` with its own full-screen backdrop, so it takes over the entire screen regardless.

### 2. Make the Game Over overlay responsive to landscape (`WinnerOverlay.tsx`)
- Add landscape-aware layout so the card reorganizes horizontally when in landscape:
  - Use a landscape media query approach: in landscape, switch the inner card to a horizontal two-column layout (winner info + stats side by side) with reduced vertical spacing and smaller trophy.
  - Reduce padding and font sizes slightly in landscape to prevent overflow.
  - Add `overflow-y-auto max-h-[100dvh]` to the inner card so it scrolls if needed on very small screens.
- Keep the current vertical layout for portrait, which already works well.

## Files to Modify

| File | Change |
|------|--------|
| `src/components/poker/PokerTablePro.tsx` | Skip portrait-block overlay when game phase is `game_over` |
| `src/components/poker/WinnerOverlay.tsx` | Add landscape-responsive layout with horizontal flow and scroll safety |

## Technical Details

**PokerTablePro.tsx**: The component already receives `phase` from the game state. Wrap the portrait overlay condition: `{!isLandscape && phase !== 'game_over' && (...)}`.

**WinnerOverlay.tsx**: 
- Add `overflow-y-auto` and `max-h-[90dvh]` to the inner card container for scroll safety
- Use Tailwind `landscape:` modifier to switch to a more compact horizontal layout:
  - `landscape:max-w-2xl landscape:flex-row` on the inner container to go side-by-side
  - Reduce trophy size and spacing in landscape
  - Stats grid stays 2-col but with tighter padding
  - Buttons row stays at the bottom spanning full width

