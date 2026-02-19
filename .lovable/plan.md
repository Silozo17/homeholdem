

# Fix Learn Poker Tutorial: Correct Messages, Redesign Coach UI, Fix Highlights

## Issues Found

### 1. Factual poker errors in Lesson 2 (Hand Rankings)

The scripted messages contain wrong hand evaluations:

**After Flop (A-club K-heart 8-diamond) with Viktor holding K-spade K-club:**
- Message says: "Viktor has Two Pair (K-K + A on board)" -- **WRONG**
- Viktor has K-spade K-club + K-heart on the board = **Three of a Kind (Kings)**, not Two Pair
- The recap step also says "Viktor: Two Pair (Kings + Aces)" -- **WRONG**, it's Three of a Kind Kings

**After Turn (A-spade added) with Viktor holding K-spade K-club:**
- Message says: "Four of a Kind -- the 2nd best hand in poker! Only a Straight Flush beats this" -- should clarify Royal Flush is the absolute best (a type of Straight Flush)
- Then says: "Viktor's best hand is a Full House (K-K-K-A-A... wait, no -- he has Two Pair K+A)" -- **DOUBLE WRONG and self-correcting**
- Viktor actually has K-spade K-club + board K-heart A-club A-spade = **Full House (Kings full of Aces)**. The self-correction makes it worse.

### 2. Repeated action button highlighting

Every single `require_action` step has `highlight: 'actions'` which re-highlights the buttons that were already introduced in the intro tour and shown multiple times. After the first time the user taps action buttons, the highlight ring should not appear again.

**Fix:** Only set `highlight: 'actions'` on the FIRST `require_action` step per lesson. Remove it from all subsequent ones.

### 3. Coach UI redesign -- separate avatar circle from text bubble with floating pointer hands

Current: Avatar and text are inside one card together.
Requested: Coach avatar as a standalone circle, a separate speech bubble with text, and floating pointing hand emojis that appear near highlighted elements (not just for actions).

---

## Plan

### File 1: `src/lib/poker/tutorial-lessons.ts`

**Fix Lesson 2 messages:**

| Line | Current (wrong) | Correct |
|------|-----------------|---------|
| 194 | "Viktor has Kings and pairs his K-heart for Two Pair (K-K + A on board)" | "Viktor has three Kings on the board -- Three of a Kind! But your Three Aces beat his Three Kings." |
| 195 | "Viktor: Two Pair (Kings + Aces)" | "Viktor: Three of a Kind (Kings)" |
| 198 | "Four of a Kind -- the 2nd best hand" | "FOUR OF A KIND -- only a Straight Flush (or Royal Flush) can beat this!" |
| 199 | "his best hand is a Full House (K-K-K-A-A... wait, no -- he has Two Pair K+A)" | "Viktor now has a Full House (Kings full of Aces) -- but your Four Aces still crush it!" |

**Remove repeated `highlight: 'actions'`:**
- In every lesson, keep `highlight: 'actions'` ONLY on the first `require_action` step
- Remove it from all subsequent `require_action` steps in that lesson
- This affects lessons 1-10 (approximately 30+ steps to update)

### File 2: `src/components/poker/CoachOverlay.tsx`

**Redesign to separate avatar from speech bubble + floating pointer hands:**

- Coach avatar: a standalone circle positioned at the left edge of the speech bubble area (not inside the card)
- Speech bubble: a separate rounded card with the text, positioned adjacent to the avatar (like a chat message)
- Floating pointer hand: when a `highlight` is active, render an appropriate hand emoji (pointing up/down/left/right) near the highlighted element, with a bounce animation. The hand direction is determined by the highlight position:
  - `actions` (bottom-right): pointing down hand
  - `cards` (bottom-center): pointing down hand
  - `community` (center): pointing up hand
  - `pot` (upper-center): pointing up hand
  - `exit` (top-left): pointing left hand
  - `audio` (top-right): pointing right hand
  - `timer` (top-center): pointing up hand
  - `table` (center): no hand (too large)
- Remove the current combined card layout
- Only show the highlight ring on intro steps (the table tour), not on gameplay steps that re-highlight actions

### File 3: `src/i18n/locales/en.json` and `src/i18n/locales/pl.json`

- Update the `"Continue"` and `"Got it"` button text keys if not already translated
- Add translation for "Step X/Y" indicator text

---

## Summary of changes

| File | Change |
|------|--------|
| `src/lib/poker/tutorial-lessons.ts` | Fix 4 wrong poker hand descriptions in Lesson 2. Remove `highlight: 'actions'` from all but the first `require_action` per lesson. |
| `src/components/poker/CoachOverlay.tsx` | Redesign: separate circle avatar from speech bubble. Add floating pointer hands near highlights. Only show highlight ring during intro steps. |
| `src/i18n/locales/en.json` | Add/update coach UI translation keys |
| `src/i18n/locales/pl.json` | Add/update Polish translations for coach UI |

## What does NOT change
- Game logic, hooks, or reducer
- Seat layout or table positioning
- Bottom navigation
- No database changes

