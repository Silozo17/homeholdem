

# Fix Last Remaining Raw Amount in Coach Message

## Problem
Line 394 in `src/lib/poker/tutorial-lessons.ts` still says "set to around 500" instead of referencing the quick bet presets like all the other raise instructions.

The "350" amounts were already removed in earlier edits -- there are none left in the file. This single line is the only inconsistency remaining.

## Fix

**File:** `src/lib/poker/tutorial-lessons.ts` -- Line 394

| Before | After |
|--------|-------|
| `"Value bet your straight! Make Viktor pay. Tap 'Raise', set to around 500, and confirm!"` | `"Value bet your straight! Make Viktor pay. Tap 'Raise', use the presets above the slider (try '¾ Pot'), and confirm!"` |

## What does NOT change
- No other files touched
- Bottom navigation unchanged
- Game logic unchanged
- BettingControls.tsx unchanged

