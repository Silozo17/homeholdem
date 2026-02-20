

# Add Post-Fold Gameplay to Lesson 7 (When to Fold)

## Problem
After the user folds with 7-2, the lesson jumps straight to `show_result` with Viktor shown as "Winner!" -- but no community cards are dealt and no bot actions happen. This skips the entire rest of the hand, which is confusing for a learner. In real poker, the remaining players continue playing and there's a showdown.

## Fix

Replace the single `show_result` step (line 436) with a sequence that plays out the hand between Viktor and Luna while the coach narrates what's happening:

1. **Coach message**: "You folded -- smart play! Now let's watch how the rest of the hand plays out between Viktor and Luna."
2. **Deal flop** (A-K-8): Coach explains Viktor flopped trip Aces, Luna has a pair of Kings. Viktor is way ahead.
3. **Bot action**: Viktor bets (he has trips).
4. **Bot action**: Luna calls (she has top pair, doesn't know Viktor has trips).
5. **Deal turn** (4c): Coach notes nothing changed -- Viktor still dominant.
6. **Bot action**: Viktor bets again.
7. **Bot action**: Luna calls again.
8. **Deal river** (3s): Coach notes the blank river.
9. **Bot action**: Viktor bets once more.
10. **Bot action**: Luna calls.
11. **Show result**: Coach explains Viktor wins with trip Aces vs Luna's pair of Kings. Reinforces the fold lesson -- "Your 7-2 would have made nothing. Great fold!"

## Technical Details

**File:** `src/lib/poker/tutorial-lessons.ts` (line 436 replaced with ~11 new steps)

The steps use existing step types: `coach_message`, `deal_community`, `bot_action`, and `show_result`. The `deal_community` steps will deal the pre-configured flop/turn/river cards. Bot actions use explicit amounts.

Step count goes from 8 to ~18, which the step counter handles automatically.

## What does NOT change
- CoachOverlay UI
- Bottom navigation
- Game reducer logic or hooks
- Database
- Translations
- Any other files

