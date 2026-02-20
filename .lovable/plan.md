

# Update Raise Instructions to Reference Quick Bet Presets

## Problem
When the raise slider is open, there are quick bet preset buttons above it (2xBB, 1/2 Pot, 3/4 Pot, Pot, All-in), but the coach messages never mention them. The instructions just say "set to around 300" which leaves the user guessing how to use the slider. The presets are the easiest way to set amounts.

## Fix

Update all `require_action` raise messages in `src/lib/poker/tutorial-lessons.ts` to reference the relevant quick bet preset button instead of a raw number.

**File:** `src/lib/poker/tutorial-lessons.ts`

### Pre-flop raises (use "2xBB" or specific amount):
| Line | Current | Updated message |
|------|---------|----------------|
| 135 | "...set the amount to around 300, then tap 'Raise' again to confirm!" | "...Use the quick bet presets above the slider -- try tapping '1/2 Pot' or set it to around 300 -- then tap 'Raise' again to confirm!" |
| 186 | "...set to around 400, and confirm!" | "...use the preset buttons above the slider (try '1/2 Pot'), and confirm!" |
| 288 | "...set to around 300, and confirm!" | "...use the preset buttons above the slider (try '1/2 Pot'), and confirm!" |
| 484 | "...set to around 300, and confirm!" | "...use the preset buttons above the slider (try '1/2 Pot'), and confirm!" |
| 533 | "...set to around 300, and confirm!" | "...use the preset buttons above the slider (try '1/2 Pot'), and confirm!" |
| 588 | "...set to around 300, and confirm!" | "...use the preset buttons above the slider (try '1/2 Pot'), and confirm!" |

### Post-flop raises (use pot-fraction presets):
| Line | Current | Updated message |
|------|---------|----------------|
| 147 | "...set to around 400, and confirm!" | "...use the presets above the slider (try 'Pot'), and confirm!" |
| 191 | "...set to around 300, and confirm!" | "...use the presets above the slider (try '1/2 Pot'), and confirm!" |
| 196 | "...set to around 500, and confirm!" | "...use the presets above the slider (try '3/4 Pot'), and confirm!" |
| 200 | "...set to around 600, and confirm!" | "...use the presets above the slider (try 'Pot'), and confirm!" |
| 249 | "...pick your amount, and confirm!" | "...use the presets above the slider (try '1/2 Pot'), and confirm!" |
| 292 | "...set to around 250, and confirm!" | "...use the presets above the slider (try '1/2 Pot'), and confirm!" |
| 296 | "...set to around 400, and confirm!" | "...use the presets above the slider (try '3/4 Pot'), and confirm!" |
| 343 | "...set to around 500, and confirm!" | "...use the presets above the slider (try '3/4 Pot'), and confirm!" |
| 489 | "...set to around 350, and confirm!" | "...use the presets above the slider (try '1/2 Pot'), and confirm!" |
| 493 | "...set to around 500, and confirm!" | "...use the presets above the slider (try '3/4 Pot'), and confirm!" |
| 539 | "...set to around 250, and confirm!" | "...use the presets above the slider (try '1/2 Pot'), and confirm!" |
| 543 | "...set to around 400, and confirm!" | "...use the presets above the slider (try '3/4 Pot'), and confirm!" |
| 548 | "...set to around 350, and confirm!" | "...use the presets above the slider (try '1/2 Pot'), and confirm!" |
| 592 | "...set to around 300, and confirm!" | "...use the presets above the slider (try '1/2 Pot'), and confirm!" |
| 596 | "...set to around 400, and confirm!" | "...use the presets above the slider (try '3/4 Pot'), and confirm!" |
| 601 | "...set to around 500, and confirm!" | "...use the presets above the slider (try '3/4 Pot'), and confirm!" |

### First raise (Lesson 1, line 135) -- most detailed:
The very first raise will be the most explanatory:
> "With A-K suited, you should raise! This tells opponents you're strong and builds the pot. Tap 'Raise' to open the bet slider. Use the quick bet presets above the slider -- try tapping '1/2 Pot' or set it to around 300 -- then tap 'Raise' again to confirm!"

This teaches them what the presets are. All subsequent messages will use the shorter form: "use the presets above the slider (try '1/2 Pot')".

## What does NOT change
- BettingControls.tsx (no UI changes)
- Bottom navigation
- CoachOverlay UI
- Game logic
- Database
- Any other files

