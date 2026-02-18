

# Fix Tutorial Action Blocking + Visual Control Display

## Root Causes Found

### Bug 1: Action guard silently blocks but buttons look fully active
The `guardedAction` wrapper in `LearnPoker.tsx` does block incorrect actions, but `BettingControls` has no visual indication that buttons are disabled. Users see a fully styled, clickable Fold button and assume the guard isn't working. The buttons need to be visually greyed out / disabled when blocked.

### Bug 2: "raise" guard blocks "all-in" variant
When `allowedAction = 'raise'` and the user slides to max chips, `BettingControls` sends `{ type: 'all-in' }` instead of `{ type: 'raise' }`. Since `'all-in' !== 'raise'`, the guard rejects it. The guard must treat `'all-in'` as a valid match for `'raise'` (raising all your chips is still a raise).

### Bug 3: Coach says "here are your controls" but only shows outline, not the actual buttons
When the coach highlights the action area during intro steps, the betting controls aren't visible because `showActions` requires `isHumanTurn` to be true, but during intro steps `isPaused = true` so `isHumanTurn = false`. The controls need to be force-shown (read-only) during relevant intro steps.

---

## Changes

### File 1: `src/pages/LearnPoker.tsx`

**Fix the action guard to handle raise/all-in equivalence and pass visual blocking info:**

```typescript
const guardedAction = useCallback((action: GameAction) => {
  if (allowedAction) {
    // Treat all-in as valid when raise is required (sliding to max)
    const actionMatches = 
      action.type === allowedAction ||
      (allowedAction === 'raise' && action.type === 'all-in');
    if (!actionMatches) return; // blocked
  }
  playerAction(action);
}, [allowedAction, playerAction]);
```

**Pass `allowedAction` to PokerTablePro so BettingControls can visually disable blocked buttons:**

Add a new prop `tutorialAllowedAction` to the PokerTablePro call:

```tsx
<PokerTablePro
  state={state}
  isHumanTurn={isHumanTurn}
  amountToCall={amountToCall}
  canCheck={canCheck}
  maxBet={maxBet}
  onAction={guardedAction}
  onNextHand={nextHand}
  onQuit={handleQuit}
  tutorialAllowedAction={allowedAction}
  forceShowControls={!!currentIntroStep?.highlight && currentIntroStep.highlight === 'actions'}
/>
```

### File 2: `src/components/poker/PokerTablePro.tsx`

**Accept new props and pass to BettingControls:**

Add to the interface:
```typescript
tutorialAllowedAction?: string | null;
forceShowControls?: boolean;
```

Update `showActions` to include force-show:
```typescript
const showActions = (isHumanTurn && humanPlayer && humanPlayer.status === 'active' && dealAnimDone) || forceShowControls;
```

Pass `tutorialAllowedAction` to BettingControls:
```tsx
<BettingControls
  ...existing props...
  tutorialAllowedAction={tutorialAllowedAction}
/>
```

### File 3: `src/components/poker/BettingControls.tsx`

**Accept `tutorialAllowedAction` prop and visually disable blocked buttons:**

Add to interface:
```typescript
tutorialAllowedAction?: string | null;
```

When `tutorialAllowedAction` is set:
- Fold button: if `tutorialAllowedAction !== 'fold'`, add `opacity-30 pointer-events-none` classes
- Check/Call button: if `tutorialAllowedAction !== 'check' && tutorialAllowedAction !== 'call'`, add `opacity-30 pointer-events-none`  
- Raise button: if `tutorialAllowedAction !== 'raise'`, add `opacity-30 pointer-events-none`

The allowed button gets a pulsing glow effect to draw attention:
```typescript
const isAllowed = (type: string) => !tutorialAllowedAction || tutorialAllowedAction === type || 
  (tutorialAllowedAction === 'raise' && type === 'all-in');
const blockedClass = 'opacity-30 pointer-events-none grayscale';
const glowClass = 'ring-2 ring-primary/60 animate-pulse';
```

Apply to both landscape and portrait button variants.

### File 4: `src/hooks/useTutorialGame.ts`

**Fix the guard logic for raise/all-in in playerAction too:**

```typescript
const playerAction = useCallback((action: GameAction) => {
  if (pendingRequiredAction) {
    const matches = action.type === pendingRequiredAction ||
      (pendingRequiredAction === 'raise' && action.type === 'all-in');
    if (matches) setPendingRequiredAction(null);
  }
  dispatch({ type: 'PLAYER_ACTION', action });
}, [pendingRequiredAction]);
```

---

## Files Changed

| File | Change |
|------|--------|
| `src/pages/LearnPoker.tsx` | Fix raise/all-in equivalence in guard; pass `tutorialAllowedAction` and `forceShowControls` props |
| `src/components/poker/PokerTablePro.tsx` | Accept new props; pass to BettingControls; support force-showing controls |
| `src/components/poker/BettingControls.tsx` | Accept `tutorialAllowedAction`; visually disable blocked buttons with opacity+pointer-events; add glow to allowed button |
| `src/hooks/useTutorialGame.ts` | Fix raise/all-in equivalence in `playerAction` pending action clearing |

## NOT Changed
- Tutorial lessons content, bot scripts
- CoachOverlay component
- Bottom navigation, layout, other pages
- Database, edge functions

