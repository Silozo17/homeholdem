

# Use Real Poker Table + Seamless Lesson Flow

Two changes: (1) swap the simple `PokerTable` for the premium `PokerTablePro` so tutorial players get the real table experience, and (2) make lessons flow continuously without leaving the table view.

## 1. Replace PokerTable with PokerTablePro

In `src/pages/LearnPoker.tsx`:
- Replace the `PokerTable` import with `PokerTablePro`
- `PokerTablePro` accepts the same props (`state, isHumanTurn, amountToCall, canCheck, maxBet, onAction, onNextHand, onQuit`)
- This gives the tutorial the same premium visuals: felt table image, dealer character, seat anchors with elliptical layout, card deal animations, sounds, landscape mode, etc.

## 2. Seamless Lesson Transitions (No Exit to Menu)

Currently after a hand completes, the page shows a full-screen "summary" view, then the player taps "Next Lesson" which goes to another full-screen "intro" view. Instead:

- **Remove the `intro` and `summary` views entirely** from the lesson flow (keep `select` for initial entry only)
- **After hand_complete**: show a compact overlay *on top of the poker table* (not a full-screen replacement) with the lesson summary and a "Next Lesson" button
- **When "Next Lesson" is tapped**: immediately call `startLesson(nextLesson)` which resets the game state and deals new cards -- the table stays rendered underneath the whole time, so visually it just transitions to the next hand seamlessly
- The first lesson starts directly from the select screen without an intro screen (the coach overlay already explains the concept)

### New Component: `LessonCompleteOverlay`

A compact overlay rendered inside the playing view (similar to `WinnerOverlay`), containing:
- Lesson title + checkmark
- 2-3 key takeaway bullet points
- "Next Lesson" button (or "All Done" on the last lesson)
- Semi-transparent backdrop so the table is still visible behind it

### Updated Flow

```text
Lesson Select --> tap lesson --> table loads, lesson starts immediately
  --> hand plays out with coach tips
  --> hand_complete: LessonCompleteOverlay appears ON TOP of table
  --> tap "Next Lesson": overlay dismisses, next lesson starts on same table
  --> ... repeats until all lessons done
  --> final lesson: "Back to Lessons" returns to select screen
```

## 3. Hook Changes (`useTutorialGame`)

- The `NEXT_HAND` action currently sets `phase: 'game_over'`. Change it so it can accept a new lesson and restart seamlessly (or just call `startLesson` from the page level, which already does `RESET` then `START_GAME`)
- No other hook changes needed -- `startLesson` already handles resetting state

## Files Changed

| File | Change |
|------|--------|
| `src/pages/LearnPoker.tsx` | Replace `PokerTable` with `PokerTablePro`; remove `intro`/`summary` views; add inline `LessonCompleteOverlay`; wire "Next Lesson" to call `startLesson` directly |
| `src/components/poker/CoachOverlay.tsx` | No changes needed (already overlays on top) |
| `src/hooks/useTutorialGame.ts` | No changes needed (`startLesson` already resets and restarts) |

## NOT Changed
- `PokerTablePro.tsx` -- no modifications
- Bottom navigation, layout, styles, other pages, edge functions, database

