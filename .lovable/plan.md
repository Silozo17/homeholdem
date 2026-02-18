

# Overhaul: Learn Poker Tutorial System

A complete redesign of the tutorial engine, coaching UI, bot behavior, and lesson structure to create a guided, step-by-step learning experience where nothing is left to chance.

---

## Current Problems

1. **Bots act freely** -- They use `decideBotAction()` as fallback when scripted actions run out, making gameplay unpredictable
2. **User can click any button** -- No action blocking; user can fold when asked to raise
3. **Coach overlay blurs background** -- Backdrop blur prevents seeing what the coach refers to
4. **Incomplete control explanations** -- Timer, audio toggle, exit button, chat, seat selection never explained
5. **No directional pointing** -- Overlays don't visually point at specific UI elements
6. **Intro steps are too brief** -- Only 5 generic messages before Lesson 1; no per-control walkthroughs
7. **Pacing too fast** -- Bot actions and phase transitions happen without waiting for user acknowledgment

---

## Solution Overview

### A. Fully Scripted Bots (No Free Will)

Every bot action in every lesson will be pre-programmed. Remove the `decideBotAction()` fallback entirely from the tutorial engine. If a bot has no scripted action left, it defaults to `fold` (safe, predictable). This guarantees the exact game flow the lesson expects.

**Changes in `useTutorialGame.ts`:**
- Remove the `decideBotAction` import and fallback branch
- When `scriptedActions[actionIdx]` is undefined, default to `{ type: 'fold' }`
- All 10 lessons get complete `botActions` mappings covering every betting round

### B. Action Blocking (Force Correct User Input)

When a `TutorialStep` has a `requiredAction`, disable all other buttons. The user can ONLY click the action the coach is asking for.

**Changes:**
- `useTutorialGame.ts` exports a new `allowedAction: PlayerAction | null` derived from the current step
- `LearnPoker.tsx` passes `allowedAction` down to `PokerTablePro` (or wraps `onAction` to filter)
- The `onAction` wrapper ignores any action that doesn't match `allowedAction` when set
- `BettingControls` receives an optional `disabledActions` prop to visually grey out blocked buttons (or `PokerTablePro` gets a wrapper `onAction` that simply no-ops wrong actions -- simpler, no changes to BettingControls needed)

**Implementation approach (minimal changes):** Wrap `onAction` in `LearnPoker.tsx`:
```typescript
const guardedAction = useCallback((action) => {
  if (allowedAction && action.type !== allowedAction) return; // blocked
  playerAction(action);
}, [allowedAction, playerAction]);
```
Pass `guardedAction` to `PokerTablePro` instead of `playerAction`.

### C. Coach Overlay Redesign

**Remove backdrop blur** -- Replace `bg-background/40 backdrop-blur-[2px]` with a semi-transparent dark overlay that does NOT blur, so the game table stays visible.

**Add directional pointing:**
- New `IntroStep` fields: `highlight?: 'actions' | 'cards' | 'community' | 'timer' | 'audio' | 'exit' | 'pot'`
- When `highlight` is set, render a pulsing ring/glow effect at the target area using fixed CSS positions (not CSS selectors, which are fragile)
- The coach bubble repositions itself to avoid overlapping the highlighted area

**Animated coach character:**
- Reuse the existing `DealerCharacter` component (poker dealer) as the coach avatar inside the overlay
- Or use a small circular avatar with the dealer image from `src/assets/dealer/dealer-main.png`
- Add a subtle bounce animation when new messages appear

**Overflow prevention:**
- Use `max-h-[50vh]` and `overflow-y-auto` on the message container
- Position with safe-area-aware padding
- Ensure the bubble never goes off-screen by using `bottom` positioning with `min()` calculations

### D. Expanded Lesson 1 Intro Sequence

Lesson 1's `introSteps` will be expanded from 5 to ~12 steps, covering every UI element:

1. "Welcome to Learn Poker! I'm your coach. I'll walk you through everything step by step."
2. "First, let's look at the table. This is a Texas Hold'em poker table with 4 seats." (highlight: table)
3. "Your seat is at the bottom. Your private cards ('hole cards') will appear here." (highlight: cards, arrow: down)
4. "The shared cards ('community cards') appear in the center of the table." (highlight: community, arrow: up)
5. "The pot (total chips bet) is shown above the community cards." (highlight: pot)
6. "At the top-left, the back arrow lets you leave the table." (highlight: exit, arrow: up)
7. "At the top-right, the speaker icon toggles game sounds on/off." (highlight: audio, arrow: up)
8. "The hand number and blind levels are shown at the top." (highlight: timer, arrow: up)
9. "When it's your turn, action buttons appear at the bottom: Fold, Check/Call, and Raise." (highlight: actions, arrow: down)
10. "Fold = give up your hand. Check = pass (when no bet). Call = match a bet. Raise = increase the bet." (position: center)
11. "I'll pause at every important moment to explain. Take your time -- there's no rush!" (position: center)
12. "Ready? Let's deal your first hand!" (position: center)

### E. Per-Step Pausing with User Acknowledgment

The current system shows a coach step, user clicks "Got it", and the game immediately continues. The problem is bots act instantly after unpause.

**Improved pacing in `useTutorialGame.ts`:**
- After dismissing a coach step, add a 1500ms delay before bots start acting
- After each community card phase transition (flop/turn/river), auto-trigger the next coach step BEFORE any bot acts
- Bot action delay increased to ~1500ms with visual "thinking" state

### F. Complete Bot Action Scripts for All 10 Lessons

Every lesson will have complete `botActions` entries. No bot will ever fall through to `decideBotAction()`. Example for Lesson 1:

```typescript
botActions: {
  'bot-0': ['fold'],           // folds preflop
  'bot-1': ['fold'],           // folds preflop  
  'bot-2': ['call', 'check', 'check', 'fold'],  // calls pre, checks flop/turn, folds river
}
```

Each lesson's bot scripts will be designed to create the exact scenario the lesson teaches.

---

## Files Changed

| File | Change |
|------|--------|
| `src/hooks/useTutorialGame.ts` | Remove `decideBotAction` fallback; add `allowedAction` export; increase bot delay; add post-dismiss delay |
| `src/lib/poker/tutorial-lessons.ts` | Expand Lesson 1 intro to ~12 steps with `highlight` fields; add complete `botActions` to ALL lessons; add `highlight` field to `IntroStep` interface |
| `src/components/poker/CoachOverlay.tsx` | Remove backdrop blur; add highlight ring rendering; add dealer avatar; add bounce animation; fix overflow |
| `src/pages/LearnPoker.tsx` | Wrap `onAction` with action guard using `allowedAction`; pass guarded handler to `PokerTablePro` |

## NOT Changed

- `PokerTablePro.tsx` -- no modifications
- `BettingControls.tsx` -- no modifications  
- Bottom navigation, layout, styles, other pages
- Edge functions, database, existing poker game

---

## Technical Details

### New `IntroStep` Interface

```typescript
export interface IntroStep {
  message: string;
  position?: 'top' | 'center' | 'bottom';
  arrowDirection?: 'down' | 'up' | 'none';
  highlight?: 'actions' | 'cards' | 'community' | 'timer' | 'audio' | 'exit' | 'pot' | 'table';
}
```

### Action Guard (LearnPoker.tsx)

```typescript
const allowedAction = isPaused ? null : currentStep?.requiredAction || null;

const guardedAction = useCallback((action) => {
  if (allowedAction && action.type !== allowedAction) return;
  playerAction(action);
}, [allowedAction, playerAction]);

// Pass guardedAction to PokerTablePro's onAction prop
```

### Bot Fallback (useTutorialGame.ts)

```typescript
// BEFORE (current):
if (scriptedActions && actionIdx < scriptedActions.length) {
  botAction = { type: scriptedActions[actionIdx] };
} else {
  botAction = decideBotAction(...); // FREE WILL - REMOVE THIS
}

// AFTER:
if (scriptedActions && actionIdx < scriptedActions.length) {
  botAction = { type: scriptedActions[actionIdx] };
} else {
  botAction = { type: 'fold' }; // Safe default, no free will
}
```

### Coach Overlay Backdrop (CoachOverlay.tsx)

```typescript
// BEFORE:
<div className="fixed inset-0 bg-background/40 backdrop-blur-[2px] ..." />

// AFTER:
<div className="fixed inset-0 bg-black/20 ..." />  // Subtle dim, NO blur
```

### Highlight Ring

When `highlight` is set on an intro step, render a pulsing ring at a predefined screen position:

```typescript
const HIGHLIGHT_POSITIONS: Record<string, React.CSSProperties> = {
  actions: { bottom: '8%', left: '50%', transform: 'translateX(-50%)', width: '80%', height: '60px' },
  exit: { top: 'calc(env(safe-area-inset-top) + 10px)', left: '12px', width: '32px', height: '32px' },
  audio: { top: 'calc(env(safe-area-inset-top) + 10px)', right: '12px', width: '32px', height: '32px' },
  community: { top: '45%', left: '50%', transform: 'translate(-50%, -50%)', width: '240px', height: '70px' },
  pot: { top: '20%', left: '50%', transform: 'translateX(-50%)', width: '80px', height: '30px' },
  cards: { bottom: '18%', left: '50%', transform: 'translateX(-50%)', width: '100px', height: '70px' },
  timer: { top: 'calc(env(safe-area-inset-top) + 10px)', left: '50%', transform: 'translateX(-50%)', width: '120px', height: '24px' },
};
```

Each highlight renders as a rounded div with `ring-2 ring-primary animate-pulse` over the target area.

