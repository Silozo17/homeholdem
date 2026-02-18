

# Complete Tutorial System Redesign: Step-Driven Architecture

## Problem Summary

The current tutorial is fundamentally broken because it uses a **phase-reactive** architecture: the game engine runs autonomously (bots act on their own, phases advance automatically), and the coach overlay tries to react to phase changes. This causes:

1. **Bot actions fire too fast** -- bots act in ~1.2s with no explanation
2. **Coach steps get skipped** -- the step-matching logic misses triggers when phases advance quickly
3. **No visual structure** -- cards appear without pausing to explain
4. **Bots fall back to fold** when scripted actions run out, ending hands prematurely
5. **No "show, explain, act" flow** -- the user sees a chaotic game, not a guided lesson

## Solution: Step-Driven Sequential System

Replace the phase-reactive engine with a **step-driven controller** where every visual event is an explicit scripted step. Nothing happens autonomously. The controller walks through steps one by one:

```text
Step 1: [coach_message] "Welcome! You've been dealt..."
         -> User taps "Got it"
Step 2: [coach_message] "Two players posted blinds..."
         -> User taps "Got it"
Step 3: [bot_action] Viktor folds (1.5s delay, then explanation)
         -> User taps "Got it"
Step 4: [require_action] "Your turn! Tap Raise"
         -> Waits for user to tap Raise
Step 5: [deal_community] Flop dealt (animation plays, then explain)
         -> User taps "Got it"
...and so on
```

### New Step Types

| Type | What happens | Advances when |
|------|-------------|---------------|
| `coach_message` | Show speech bubble with message | User taps "Got it" |
| `deal_hole_cards` | Dispatch DEAL_HAND, wait for animation, show message | User taps "Got it" |
| `deal_community` | Deal flop/turn/river, wait for animation, show message | User taps "Got it" |
| `bot_action` | Execute a specific bot action with delay, then explain | User taps "Got it" |
| `require_action` | Highlight button, wait for user to perform action | User performs action |
| `show_result` | Trigger showdown, display winner | User taps "Got it" |

### Coach Overlay Improvements (Reference Image Style)

- Keep existing speech-bubble + dealer avatar layout (already matches reference style)
- Add a subtle **pointing hand indicator** near highlighted elements (like the reference images)
- Ensure the overlay always positions near the relevant UI element
- Add a step counter ("Step 3 of 12") so users feel progress

---

## Files Changed

| File | Change |
|------|--------|
| `src/lib/poker/tutorial-lessons.ts` | Complete rewrite: new `ScriptedStep` type, all 10 lessons rewritten with explicit step-by-step sequences |
| `src/hooks/useTutorialGame.ts` | Complete rewrite: step-driven controller, no autonomous bot logic, delays built into step execution |
| `src/components/poker/CoachOverlay.tsx` | Add step counter, pointing hand indicator, improved positioning |
| `src/pages/LearnPoker.tsx` | Minor: pass step count info to CoachOverlay |

---

## New Data Model

```text
ScriptedStep {
  type: 'coach_message' | 'deal_hole_cards' | 'deal_community'
        | 'bot_action' | 'require_action' | 'show_result'
  message: string              -- Coach speech bubble text
  botId?: string               -- For bot_action: which bot acts
  botAction?: GameAction       -- For bot_action: what action
  requiredAction?: PlayerAction-- For require_action: what user must do
  communityPhase?: 'flop'|'turn'|'river' -- For deal_community
  highlight?: string           -- UI element to highlight
  delay?: number               -- ms delay before showing this step (default 1500)
}
```

---

## Lesson 1 Full Step Sequence: "The Basics"

After the 12 intro steps (table tour, kept as-is), the game steps are:

| # | Type | Message | Key Detail |
|---|------|---------|------------|
| 1 | `deal_hole_cards` | "Your cards are dealt! You have A-K suited -- a premium starting hand! Only about 2% of hands are this strong." | Deals cards, waits for animation |
| 2 | `coach_message` | "Before cards were dealt, two players posted forced bets called 'blinds'. Small Blind (50) and Big Blind (100). This creates a pot worth fighting for." | Highlights pot |
| 3 | `coach_message` | "This is the 'Pre-flop' round -- the first of four betting rounds. Players act clockwise. Let's watch..." | |
| 4 | `bot_action` | "Viktor folded. His cards were weak -- he's saving his chips for a better hand. Good players fold about 70% of hands!" | Bot 0 folds, 1.5s delay |
| 5 | `bot_action` | "Luna folded too. Two players down, two remain. Folding bad hands is a winning strategy!" | Bot 1 folds, 1.5s delay |
| 6 | `bot_action` | "Ace called the Big Blind (100 chips). He wants to see more cards. Now it's YOUR turn!" | Bot 2 calls, 1.5s delay |
| 7 | `require_action` | "With A-K suited, you should raise! This tells opponents you're strong. Tap 'Raise' below." | Highlights actions, requires 'raise' |
| 8 | `bot_action` | "Ace called your raise. He's staying in! Pre-flop betting is complete. Time for the Flop!" | Bot 2 calls, 1.5s delay |
| 9 | `deal_community` | "The Flop! Three community cards dealt face-up. Everyone shares these to build their best 5-card hand. You have a strong draw!" | Deals flop, animation |
| 10 | `coach_message` | "Your A-K with the board gives you overcards (Ace and King are higher than any community card) and a potential straight draw." | |
| 11 | `bot_action` | "Ace checked -- he passed without betting. When no one has bet yet, you can 'Check' too (costs nothing)." | Bot 2 checks, 1.5s delay |
| 12 | `require_action` | "Let's see the next card for free. Tap 'Check'." | Requires 'check' |
| 13 | `deal_community` | "The Turn! A 4th community card. Four shared cards on the board now, one more to come!" | Deals turn, animation |
| 14 | `bot_action` | "Ace checked again. He seems cautious." | Bot 2 checks, 1.5s delay |
| 15 | `require_action` | "Check to see the final card. Tap 'Check'." | Requires 'check' |
| 16 | `deal_community` | "The River! The final community card! You now have A-K-Q-J-10 in sequence -- that's a STRAIGHT! The 5th strongest hand in poker!" | Deals river |
| 17 | `coach_message` | "A Straight uses 5 cards in consecutive order. Your A-K plus Q-J-10 on the board = the best possible straight! Time to bet big!" | |
| 18 | `require_action` | "You have a monster hand! Bet to win more chips. Tap 'Raise'!" | Requires 'raise' |
| 19 | `bot_action` | "Ace folded! He couldn't handle your bet. You win the pot!" | Bot 2 folds |
| 20 | `show_result` | "Congratulations! You won your first poker hand with a Straight! The pot is yours." | Trigger showdown |

**Total: 20 game steps + 12 intro steps = 32 guided moments for Lesson 1**

---

## Lessons 2-10 Step Sequences (Summary)

Each lesson follows the same pattern. Key changes from current:

**Lesson 2 (Hand Rankings):** 6 steps become ~18. Each bot action is a separate step. Flop/turn/river each get explanation steps. Special emphasis on naming each hand rank as it forms.

**Lesson 3 (Betting Actions):** 8 steps become ~22. Each action type (fold, check, call, raise) gets dedicated explanation before and after.

**Lesson 4 (Position):** 6 steps become ~16. Extra explanation of dealer button and position advantage.

**Lesson 5 (Reading the Board):** 6 steps become ~18. "Outs" explained with visual cue.

**Lesson 6 (Pot Odds):** 8 steps become ~22. Math explanations with each street.

**Lesson 7 (When to Fold):** 2 steps become ~8. Show why 7-2 is bad, show what happens when you fold.

**Lesson 8 (Bluffing):** 6 steps become ~18. Explain the "story" your bets tell.

**Lesson 9 (Value Betting):** 8 steps become ~24. Explain bet sizing concepts.

**Lesson 10 (Putting It All Together):** 3 steps become ~14. Lighter coaching, more player freedom.

---

## Engine Architecture (useTutorialGame.ts)

```text
State:
  - currentStepIndex: number
  - isWaitingForAction: boolean
  - isAnimating: boolean (during deals/bot actions)
  - stepPhase: 'delay' | 'animating' | 'showing_coach' | 'waiting_action'

Flow:
  1. Step loads -> check type
  2. If delay, wait delay ms
  3. If deal/bot_action, dispatch to game reducer, wait for animation
  4. Show coach message
  5. Wait for dismiss (or action for require_action)
  6. Advance to next step
  7. Repeat until all steps done
  8. Show LessonCompleteOverlay
```

Key rules:
- **NO autonomous bot behavior** -- bots only act when a `bot_action` step fires
- **NO phase-reactive step matching** -- steps advance sequentially
- **Built-in delays** (1-2 seconds) between steps for natural pacing
- Bot actions dispatch directly to reducer, no AI decision-making

---

## CoachOverlay Updates

1. Add step progress indicator: "Step 3/20" as small text above the message
2. Add total steps to the overlay so users feel progression
3. For `require_action` steps, change button text to show required action: "Tap Raise to continue" instead of generic "Got it"
4. Add a subtle pointing hand emoji/icon near highlighted elements (inspired by reference images)
5. Keep existing dealer avatar and speech bubble design

---

## What Is NOT Changed

- Bottom navigation (untouched)
- PokerTablePro component (no changes to table rendering)
- BettingControls (keep existing tutorial action blocking/glow)
- CardDisplay, PlayerSeat, and all visual components (unchanged)
- LessonCompleteOverlay (unchanged)
- Lesson select screen in LearnPoker.tsx (unchanged)
- Any other page or component

