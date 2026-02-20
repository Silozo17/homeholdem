
# Fix Floating Hand Pointer Positions

## Problem
The floating pointer hand (pointing emoji) stays in roughly the same spot regardless of what it's pointing at. It doesn't accurately point at the target element -- it's often too high, too far off, or not aligned with the correct button/area on screen.

## Root Cause
The `POINTER_HANDS` map in `CoachOverlay.tsx` has hardcoded CSS positions that were estimated and don't match where the actual elements are. The pointer needs to sit just above/below/beside the corresponding `HIGHLIGHT_POSITIONS` element, pointing directly at it.

## Fix

**File:** `src/components/poker/CoachOverlay.tsx`

Recalculate every entry in `POINTER_HANDS` so each pointer emoji sits 2-3px outside the matching `HIGHLIGHT_POSITIONS` box, pointing directly at it:

| Target | Emoji | Current position problem | New position logic |
|--------|-------|-------------------------|-------------------|
| `actions` | pointing down | Bottom is 170px -- way above the actions area | Place just above the actions highlight box (bottom = highlight bottom + highlight height + 3px) |
| `cards` | pointing down | Roughly OK but not precise | Place just above the cards area, centered |
| `community` | pointing down (was up) | Points upward above the cards, should point down toward them | Change to pointing down, placed just above community area |
| `pot` | pointing down (was up) | Same issue | Change to pointing down, placed just above pot area |
| `exit` | pointing right | Offset too far right from the button | Place just to the right of the exit button, 2-3px gap |
| `audio` | pointing left | Offset too far left | Place just to the left of the audio button, 2-3px gap |
| `timer` | pointing down (was up) | Sits below the timer | Place just below the timer, pointing up at it |

### Specific position values (derived from HIGHLIGHT_POSITIONS):

- **actions**: `right: calc(safe-area + 70px)`, `bottom: calc(safe-area + 172px)` -- just above the 160px-tall actions box
- **cards**: `left: 50%`, `bottom: calc(8% + 73px)` -- 3px above the 70px-tall cards area
- **community**: `left: 50%`, `top: calc(42% - 3px)` with `translateX(-50%)` -- 3px above community area, pointing down
- **pot**: `left: 50%`, `top: calc(25% - 3px)` with `translateX(-50%)` -- 3px above pot, pointing down
- **exit**: `top: calc(safe-area + 10px)`, `left: calc(safe-area + 43px)` -- just to the right of the 32px exit button
- **audio**: `top: calc(safe-area + 10px)`, `right: calc(safe-area + 43px)` -- just to the left of the audio button
- **timer**: `top: calc(safe-area + 32px)`, `left: calc(safe-area + 110px)` -- just below the timer

### Emoji direction logic:
- Elements at the **bottom** of screen (actions, cards): use pointing down emoji that sits **above** the target
- Elements at the **top** of screen (exit, audio, timer, pot, community): use pointing down emoji that sits **above** the target OR pointing right/left for side buttons

## What does NOT change
- HIGHLIGHT_POSITIONS (the ring positions are correct)
- Tutorial lesson messages
- BettingControls.tsx
- Bottom navigation
- Game logic
- Database
