
# Lesson 10: Unguided Free Play

## What Changes

### 1. Rewrite Lesson 10 scripted steps (`src/lib/poker/tutorial-lessons.ts`)

Remove all `require_action` steps (which force specific actions) and all messages that reveal opponent hands. Replace with a free-play flow:

- **`deal_hole_cards`**: Show "A-H K-D -- Big Slick! A premium hand. Use everything you've learned. This one's all you!" (no mention of opponents' cards)
- **`bot_action` steps**: Remove opponent card reveals. Messages become neutral: "Viktor called.", "Luna folded.", "Ace folded." -- no hand info shown.
- **Player turns**: Change all `require_action` steps to `coach_message` steps with no `requiredAction` field. Since Lesson 10 already uses the `TutorialTipNotification` for `coach_message` steps (from previous change), these will appear as lightweight dismissible tips. But crucially, since they have no `requiredAction`, the engine won't block any action -- the player is free to do whatever they want.

However, there's a problem: the current engine only lets the player act during `require_action` steps. For true free play, the engine needs a new step type or the `require_action` steps need `requiredAction` removed.

Looking at the code (line 486-489), when `requiredAction` is null, the `playerAction` callback accepts ANY action. So: keep the step type as `require_action` (so the engine waits for user input) but set `requiredAction` to `undefined`. This means all buttons are enabled and the player can do anything.

**Updated Lesson 10 steps:**

| Step | Type | Message | Notes |
|------|------|---------|-------|
| 1 | `deal_hole_cards` | "A-H K-D -- Big Slick! Use everything you've learned. This one's all you!" | No opponent info |
| 2 | `coach_message` | "Think about position, hand strength, and your plan." | Light tip via notification |
| 3-5 | `bot_action` | "Viktor called." / "Luna folded." / "Ace folded." | No hand reveals |
| 6 | `require_action` | (no message, no requiredAction) | Player free to act -- all buttons enabled |
| 7 | `bot_action` | "Viktor called." | No hand info |
| 8 | `deal_community` | "Flop: A-C 8-D 3-H." | No analysis of opponent hands |
| 9 | `bot_action` | "Viktor checked." | Neutral |
| 10 | `require_action` | (no message, no requiredAction) | Free choice |
| 11 | `bot_action` | "Viktor called." | Neutral |
| 12 | `deal_community` | "Turn: 7-S." | Board only, no opponent analysis |
| 13 | `bot_action` | "Viktor checked." | Neutral |
| 14 | `require_action` | (no message, no requiredAction) | Free choice |
| 15 | `bot_action` | "Viktor called." | Neutral |
| 16 | `deal_community` | "River: K-C. Two Pair -- Aces and Kings!" | Your hand only |
| 17 | `bot_action` | "Viktor checked." | Neutral |
| 18 | `require_action` | (no message, no requiredAction) | Free choice |
| 19 | `bot_action` | "Viktor folded." | Neutral |
| 20 | `show_result` | Dynamic -- see below | Performance-based |

### 2. Dynamic end-of-lesson result message

**File: `src/pages/LearnPoker.tsx`**

When lesson 10 completes (`stepPhase === 'done'`), evaluate the player's performance by comparing their final chip count to their starting chips:

- **Won chips (chips > startingChips)**: show_result message = "That was good! You're ready for the real thing."
- **Lost chips or broke even**: show_result message = "You've got the basics down! With practice, you'll get better."

Since the `show_result` message is baked into the lesson data, the simplest approach is to set a generic message in the lesson ("Congratulations -- tutorial complete!") and override the `LessonCompleteOverlay` or the `showComplete` logic in `LearnPoker.tsx` to display the performance-based message.

Specifically: in `LearnPoker.tsx`, when `activeLessonIdx === 9` and `showComplete` is true, compute whether `humanPlayer.chips > activeLesson.startingChips` and pass a custom subtitle to `LessonCompleteOverlay`. Since `LessonCompleteOverlay` already receives the `lesson` prop, we can add an optional `customMessage` prop.

**File: `src/components/poker/LessonCompleteOverlay.tsx`**
- Add optional `customMessage?: string` prop
- If provided, display it instead of the default lesson summary

### 3. Remove `highlight: 'actions'` from free-play require_action steps

Since there's no guided action, there should be no highlight ring around the actions panel during free play. The `require_action` steps in lesson 10 will have no `highlight` property.

## Summary of file changes

| File | Change |
|------|--------|
| `src/lib/poker/tutorial-lessons.ts` | Rewrite lesson 10: remove opponent hand reveals, remove `requiredAction` from all `require_action` steps, remove `highlight` from free-play steps |
| `src/pages/LearnPoker.tsx` | Add performance-based message logic for lesson 10 completion |
| `src/components/poker/LessonCompleteOverlay.tsx` | Add optional `customMessage` prop |

## What does NOT change
- Lessons 1-9 (all unchanged)
- Game engine / reducer logic
- BettingControls.tsx
- CoachOverlay.tsx
- Bottom navigation
- Database
