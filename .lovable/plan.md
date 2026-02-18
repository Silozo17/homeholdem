
# Fix Learn Poker Issues + Multiplayer Menu + Tutorial Intro

## Issues Identified

1. **Learn Poker page - header cut off**: The BookOpen icon at the top of the lesson list is partially hidden behind the fixed header. The spacer div only accounts for h-14 but the safe-area-top class adds extra padding that isn't matched.

2. **Bottom nav visible during Learn gameplay**: The route `/learn-poker` is not in any of AppLayout's hidden/fullscreen route lists, so the BottomNav renders on top of the poker table during lessons.

3. **Multiplayer button goes directly to online-poker**: Dashboard's GameModesGrid sends users straight to `/online-poker`. It should go to `/poker` (PokerHub) where they can choose between Online Multiplayer and Paid Tournaments.

4. **Tutorial needs intro + control explanations**: Lesson 1 should start with a welcome popup explaining the UI controls (betting buttons, chip display, etc.) before any cards are dealt. Each game action should pause for the user with clear coach tips.

---

## Changes

### 1. Fix Learn Poker page layout (LearnPoker.tsx)

- The lesson select screen has `fixed inset-0` which bypasses AppLayout's padding, but the content area needs proper spacing.
- The BookOpen icon area is overlapping with the header. Fix by ensuring the spacer correctly matches the header height including safe-area.

### 2. Hide bottom nav during Learn Poker (AppLayout.tsx)

- Add `/learn-poker` to the `hiddenNavRoutes` array (or `fullscreenRoutes`). This ensures the BottomNav is hidden when the user is on the learn page (both lesson select and gameplay).
- Since LearnPoker uses `fixed inset-0`, hiding the nav is correct for both states.

### 3. Multiplayer goes to PokerHub (GameModesGrid.tsx)

- Change the `path` for the "Multiplayer" mode from `/online-poker` to `/poker` so users see the full poker hub with Online MP, Paid Tournaments, and other options.

### 4. Tutorial intro overlay + control explainers (tutorial-lessons.ts, useTutorialGame.ts, LearnPoker.tsx)

**New intro system:**

- Add a new `introSteps` array to the `TutorialLesson` interface. These are shown BEFORE the game starts (before cards are dealt).
- For Lesson 1, add 3-4 intro steps:
  1. "Welcome to your first poker lesson! Let's start by learning the table layout."
  2. "At the bottom you'll see your action buttons: Fold, Check/Call, and Raise. These are how you play."
  3. "Your cards appear face-up at your seat. The shared cards appear in the center."
  4. "Ready? Let's deal your first hand!"

**Implementation in useTutorialGame.ts:**

- Add a new state `introPhase` that runs before the dealing phase.
- When `introPhase` is active, the game is paused and shows intro CoachOverlay steps one by one.
- Only after all intro steps are dismissed does the game proceed to dealing.

**CoachOverlay enhancements:**

- Add support for a `position` prop (e.g., `'bottom'`, `'center'`, `'top'`) so intro messages can appear in different locations.
- Add a small directional arrow indicator (CSS triangle) when the step references a UI area.
- Ensure the overlay never overflows the screen -- use `max-h` and safe-area-aware positioning.

**Pacing improvements in useTutorialGame.ts:**

- After each bot action, add a longer delay (1200ms instead of 600ms) so users can observe what happened.
- After each phase transition (flop/turn/river), ensure the coach step fires reliably before any bot actions.

---

## Files Changed

| File | Change |
|------|--------|
| `src/components/layout/AppLayout.tsx` | Add `/learn-poker` to `hiddenNavRoutes` |
| `src/components/home/GameModesGrid.tsx` | Change Multiplayer path from `/online-poker` to `/poker` |
| `src/pages/LearnPoker.tsx` | Fix layout/spacing for lesson select screen |
| `src/lib/poker/tutorial-lessons.ts` | Add `introSteps` to TutorialLesson interface; add intro steps to Lesson 1 |
| `src/hooks/useTutorialGame.ts` | Support intro phase before dealing; slower bot action pacing |
| `src/components/poker/CoachOverlay.tsx` | Add position variants and arrow indicators; ensure no overflow |

## NOT Changed

- Bottom navigation component itself
- PokerTablePro, PokerHub, OnlinePoker, or any other pages
- Styles, themes, edge functions, database
