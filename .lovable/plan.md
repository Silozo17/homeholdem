

# Fix Hand Pointer Precision + Lesson 10 Notification Tips

## Part 1: Fix Hand Pointer Positions

### Analysis of Current Layout

The action buttons in landscape mode are positioned as:
- Panel: `right: safe-area + 10px`, `bottom: safe-area + 12px`, width `180px`
- Buttons: 37px tall, 9px gap, stacked vertically: **Fold** (top), **Check/Call** (middle), **Raise** (bottom)
- Raise button vertical center: ~30px from bottom safe-area
- Panel left edge: `right: safe-area + 190px`

### Current Problems
- `actions` pointer at `right: 152px` is **inside** the panel, not beside it -- should be at ~193px to sit 3px outside the left edge
- `actions` bottom at `20px` is roughly correct for the Raise button center (~30px) but needs fine-tuning
- `raise_presets` at `bottom: 190px` is a rough guess -- needs to match actual presets panel position

### Updated POINTER_HANDS values

**File: `src/components/poker/CoachOverlay.tsx`**

| Target | Emoji | New CSS | Why |
|--------|-------|---------|-----|
| `actions` | `👉` | `right: safe-area + 193px`, `bottom: safe-area + 24px` | 3px left of the 180px-wide panel (10+180+3=193), vertically centered on the 37px Raise button (12 + 37/2 ~= 30, minus emoji half-height ~6 = 24) |
| `raise_presets` | `👉` | `right: safe-area + 193px`, `bottom: safe-area + 175px` | Same horizontal offset; vertically aligned with the presets row which sits above: 3 buttons (37px each) + 2 gaps (9px) + Cancel button (37px) + gap (9px) + presets panel midpoint. Approx bottom: 12 + 37*3 + 9*3 + 37 + 9 + ~20 = ~185px, minus emoji offset ~= 175px |
| `cards` | `👇` | Keep current (centered, 3px above cards area) |  |
| `community` | `👇` | Keep current |  |
| `pot` | `👇` | Keep current |  |
| `exit` | `👉` | `left: safe-area + 43px`, `top: safe-area + 12px` | 3px to the right of the 32px+8px exit button, vertically centered |
| `audio` | `👈` | `right: safe-area + 43px`, `top: safe-area + 12px` | 3px to the left of the 32px+8px audio button, vertically centered |
| `timer` | `👇` | Keep current |  |

---

## Part 2: Lesson 10 -- Replace Coach Overlay with Dismissible Top-Right Notifications

### Current Behaviour
Lesson 10 uses the same full CoachOverlay (dim background + speech bubble + pointer hands) as all other lessons. The user wants lesson 10 to feel more like "free play with tips" -- lightweight, non-blocking notifications.

### New Behaviour
- Create a new `TutorialTipNotification` component rendered in the top-right corner
- Small card-style notification with the tip text + an X close button
- Auto-dismisses after 10 seconds
- When a new notification appears, it replaces the previous one (auto-dismiss old)
- No dim overlay, no pointer hands -- fully immersive gameplay
- Only used for `coach_message` steps in lesson 10; `require_action` steps still use normal CoachOverlay (the player needs guidance on what to tap)

### Implementation

**New file: `src/components/poker/TutorialTipNotification.tsx`**
- Props: `message: string`, `onDismiss: () => void`
- Fixed position: top-right with safe-area padding
- Slide-in animation from the right
- 10-second auto-dismiss timer (resets when message changes)
- X button to manually dismiss
- Semi-transparent card background with backdrop blur
- Max width ~280px so it doesn't block gameplay

**Modified file: `src/pages/LearnPoker.tsx`**
- Detect when `activeLessonIdx === 9` (lesson 10, the last lesson)
- For `coach_message` steps: render `TutorialTipNotification` instead of `CoachOverlay`
- For `require_action` steps: still use `CoachOverlay` as normal (player needs the pointer guidance)
- `deal_hole_cards`, `deal_community`, `show_result` steps: use `CoachOverlay` as normal (these are important pauses)

### Summary of file changes

| File | Change |
|------|--------|
| `src/components/poker/CoachOverlay.tsx` | Update `actions` and `raise_presets` pointer positions for precision |
| `src/components/poker/TutorialTipNotification.tsx` | New component -- top-right dismissible notification |
| `src/pages/LearnPoker.tsx` | For lesson 10 `coach_message` steps, render `TutorialTipNotification` instead of `CoachOverlay` |

### What does NOT change
- Tutorial lesson data/messages in `tutorial-lessons.ts`
- BettingControls.tsx
- Bottom navigation
- Game logic / engine
- Database
- Lessons 1-9 behaviour (all unchanged)
