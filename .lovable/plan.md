

# Tell Users How Much to Raise + Fix Button Visibility

## Two Changes

### 1. Update all raise instruction messages to tell the user the exact amount

Every `require_action` step with `requiredAction: 'raise'` will be updated to include:
- The exact raise amount the user should set (matching what makes sense for that lesson scenario)
- Clear two-step instructions: "Tap 'Raise' to open the bet slider, set it to [amount], then tap 'Raise' again to confirm!"
- The **first time** a raise is required (Lesson 1, line 135), the instructions will be the most detailed, teaching the mechanic. Subsequent lessons will use shorter but still specific wording.

**File: `src/lib/poker/tutorial-lessons.ts`**

All raise steps updated (approximately 18 steps across lessons 1-10):

| Lesson | Line | Current message | New message (summary) |
|--------|------|----------------|----------------------|
| 1 | 135 | "...Tap 'Raise'." | "...Tap 'Raise' to open the bet slider, set it to 300, then tap 'Raise' again to confirm!" |
| 1 | 147 | "...Tap 'Raise'!" | "...Tap 'Raise', set to 400, and confirm!" |
| 2 | 186 | "...Tap 'Raise'." | "...Tap 'Raise', set to 400, and confirm!" |
| 2 | 191 | "...Tap 'Raise'." | "...Tap 'Raise', set to 300, and confirm!" |
| 2 | 196 | "...Tap 'Raise'." | "...Tap 'Raise', set to 500, and confirm!" |
| 2 | 200 | "...Tap 'Raise'." | "...Tap 'Raise', set to 600, and confirm!" |
| 3 | 249 | "...Tap 'Raise'." | "...Tap 'Raise', pick your amount, and confirm!" |
| 4 | 288 | "...Tap 'Raise'." | "...Tap 'Raise', set to 300, and confirm!" |
| 4 | 292 | "...Tap 'Raise'." | "...Tap 'Raise', set to 250, and confirm!" |
| 4 | 296 | "...Tap 'Raise'." | "...Tap 'Raise', set to 400, and confirm!" |
| 5 | 343 | "...Tap 'Raise'." | "...Tap 'Raise', set to 500, and confirm!" |
| 8 | 484 | "...Tap 'Raise'." | "...Tap 'Raise', set to 300, and confirm!" |
| 8 | 489 | "...Tap 'Raise'." | "...Tap 'Raise', set to 350, and confirm!" |
| 8 | 493 | "...Tap 'Raise'." | "...Tap 'Raise', set to 500, and confirm!" |
| 9 | 533 | "...Tap 'Raise'." | "...Tap 'Raise', set to 300, and confirm!" |
| 9 | 539 | "...Tap 'Raise'." | "...Tap 'Raise', set to 250, and confirm!" |
| 9 | 543 | "...Tap 'Raise'." | "...Tap 'Raise', set to 400, and confirm!" |
| 9 | 548 | "...Tap 'Raise'." | "...Tap 'Raise', set to 350, and confirm!" |
| 10 | 588 | "...Tap 'Raise'." | "...Tap 'Raise', set to 300, and confirm!" |
| 10 | 592 | "...Tap 'Raise'." | "...Tap 'Raise', set to 300, and confirm!" |
| 10 | 596 | "...Tap 'Raise'." | "...Tap 'Raise', set to 400, and confirm!" |
| 10 | 601 | "...Tap 'Raise'." | "...Tap 'Raise', set to 500, and confirm!" |

The first raise (Lesson 1, line 135) will have the most detailed instruction:
> "With A-K suited, you should raise! This tells opponents you're strong and builds the pot. Tap 'Raise' to open the bet slider, set the amount to around 300, then tap 'Raise' again to confirm!"

Subsequent raises will be shorter:
> "Bet for value! Tap 'Raise', set to 300, and confirm!"

### 2. Fix button visibility during tutorials

**File: `src/components/poker/BettingControls.tsx`** (line 36)

Replace the subtle pulse glow with full-colour visibility for the allowed button:

```
// Before (line 36):
const glowStyle = tutorialAllowedAction ? 'ring-2 ring-primary/60 animate-pulse' : '';

// After:
const allowedStyle = tutorialAllowedAction ? 'scale-105 shadow-lg shadow-primary/30' : '';
```

Then replace all 8 occurrences of `glowStyle` with `allowedStyle` (lines 141, 156, 179, 263, 277, 301 in both portrait and landscape layouts).

This means:
- **Blocked buttons**: 30% opacity, greyscale, no interaction -- clearly locked
- **Allowed button**: Full original colour, slightly enlarged (105%), bright shadow -- clearly the one to press. No pulsing animation.

---

## What does NOT change
- Raise slider does NOT auto-open (user must tap Raise manually)
- Bottom navigation
- CoachOverlay UI layout
- Game reducer logic or hooks
- Database
- Any other files

