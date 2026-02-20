

# Fix Tutorial: Bot Raise Amounts + Control Flash After Player Action

## Issue 1: Bot raises don't specify amounts

When a bot uses `{ type: 'raise' }` without an explicit `amount`, the game reducer defaults to `maxBet + minRaise` (usually just 100 -- the big blind). This means the call button correctly shows "Call 100" even when the coach message says "Viktor raised 200" or "Viktor bet 300". The fix is to add explicit `amount` values to every bot raise so the game state matches the messages.

**Affected bot raises across all lessons:**

| Lesson | Line | Message says | Fix |
|--------|------|-------------|-----|
| 3 (Betting Actions) | ~240 | "Viktor raised... betting 200" | Add `amount: 200` |
| 5 (Reading the Board) | ~333 | "Viktor raised" (no specific amount) | Add `amount: 200` for consistency |
| 6 (Pot Odds) | ~381 | "Viktor raised 200" | Add `amount: 200` |
| 6 (Pot Odds) | ~384 | "bet again -- 300" | Add `amount: 300` |
| 7 (When to Fold) | ~425 | "Viktor raised big" | Add `amount: 400` (a "big" raise) |

**File:** `src/lib/poker/tutorial-lessons.ts`

## Issue 2: Flash of controls + stale message after player acts

When the user taps Call/Fold/Raise during a `require_action` step, the `playerAction` handler in `useTutorialGame.ts`:
1. Sets `requiredAction` to `null`
2. Waits 600ms before executing the next step

During that 600ms gap, `stepPhase` is still `'waiting_action'`, so:
- `isHumanTurn` remains `true` (controls stay visible)
- `currentStep` still has the old coach message
- All 3 action buttons flash briefly with the stale message

**Fix in `useTutorialGame.ts` (playerAction callback, ~line 486):**
- Immediately set `stepPhase` to `'animating'` (hides controls and coach bubble)
- Clear `coachMessage` to empty string
- Then after 600ms, execute the next step as before

```typescript
// Current (buggy):
setRequiredAction(null);
timerRef.current = setTimeout(() => {
  executeStep(stepIndex + 1);
}, 600);

// Fixed:
setRequiredAction(null);
setStepPhase('animating');   // immediately hide controls
setCoachMessage('');          // clear stale message
timerRef.current = setTimeout(() => {
  executeStep(stepIndex + 1);
}, 600);
```

This ensures the user sees a clean transition: action executed, controls disappear instantly, then the next step loads.

## Files changed

| File | Change |
|------|--------|
| `src/lib/poker/tutorial-lessons.ts` | Add explicit `amount` to 5 bot raise actions across lessons 3, 5, 6, 7 |
| `src/hooks/useTutorialGame.ts` | Set `stepPhase='animating'` and clear `coachMessage` immediately after player acts |

## What does NOT change
- CoachOverlay UI
- Bottom navigation
- Database
- Translations
- Game reducer logic

