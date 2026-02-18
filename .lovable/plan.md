
# Fix Tutorial: Action Blocking, Highlight Positions, and Dialog Placement

## Root Cause Analysis

### Bug 1: User can click any button despite requiredAction
`allowedAction` is derived from `currentStep?.requiredAction`. When the user taps "Got it" to dismiss the coach overlay, `coachStep` resets to `-1`, making `currentStep = null` and `allowedAction = null`. This completely disables the action guard, letting the user click Fold even when asked to Raise.

**Fix:** Track `pendingRequiredAction` as separate state that persists after coach dismissal. Only clear it when the user performs the correct action.

### Bug 2: Highlight rings point at wrong positions
The game forces landscape orientation. But `HIGHLIGHT_POSITIONS` uses viewport percentages that don't match the actual landscape layout:
- "actions" highlights the bottom 6% of the screen, but in landscape the betting controls are a vertical panel on the **right side**
- "exit" and "audio" positions don't account for landscape safe-area offsets properly
- "community", "pot", "cards" are relative to viewport but elements are positioned inside a centered 16:9 table wrapper

**Fix:** Recalculate all highlight positions for landscape mobile layout, matching the actual element positions in `PokerTablePro.tsx`.

### Bug 3: Coach dialog is stuck in the middle
The dialog only supports 3 positions (top/center/bottom) and doesn't move near the highlighted element. When pointing at "exit" (top-left), the dialog should appear nearby, not centered.

**Fix:** When a `highlight` is set, auto-position the dialog adjacent to the highlight area instead of using the generic `position` prop.

---

## Changes

### File 1: `src/hooks/useTutorialGame.ts`

**Add persistent `pendingRequiredAction` state:**
- New state: `pendingRequiredAction: PlayerAction | null`
- When a coach step with `requiredAction` is dismissed, store it in `pendingRequiredAction`
- `allowedAction` returns `pendingRequiredAction` (not `currentStep?.requiredAction`)
- In `playerAction`, when the user performs the matching action, clear `pendingRequiredAction`
- This ensures the guard stays active between coach dismissal and user action

```text
Coach shows "Tap Raise" --> user taps "Got it" --> pendingRequiredAction = 'raise'
  --> Fold button: blocked (action.type !== 'raise')
  --> Check button: blocked
  --> Raise button: allowed, clears pendingRequiredAction
```

### File 2: `src/components/poker/CoachOverlay.tsx`

**Fix highlight positions for landscape:**

Based on actual element positions in `PokerTablePro.tsx`:
- `exit`: top-left, small button at ~(8px, safe-area-top + 10px), size 28x28
- `audio`: top-right, small button, same vertical position
- `actions`: right-side vertical panel, ~180px wide, bottom-right with safe-area offsets
- `community`: centered in the 16:9 table wrapper at 50% vertical
- `pot`: above community cards at ~20% of table wrapper
- `cards`: human seat area at bottom-center of table wrapper
- `timer`: top-center, the hand # and blinds text
- `table`: the 16:9 wrapper itself

New positions (landscape-aware, using viewport-relative values that match PokerTablePro):

```typescript
const HIGHLIGHT_POSITIONS: Record<string, React.CSSProperties> = {
  actions: { 
    right: 'calc(env(safe-area-inset-right, 0px) + 6px)', 
    bottom: 'calc(env(safe-area-inset-bottom, 0px) + 8px)', 
    width: '140px', height: '160px', borderRadius: '16px' 
  },
  exit: { 
    top: 'calc(env(safe-area-inset-top, 0px) + 8px)', 
    left: 'calc(env(safe-area-inset-left, 0px) + 8px)', 
    width: '32px', height: '32px', borderRadius: '50%' 
  },
  audio: { 
    top: 'calc(env(safe-area-inset-top, 0px) + 8px)', 
    right: 'calc(env(safe-area-inset-right, 0px) + 8px)', 
    width: '32px', height: '32px', borderRadius: '50%' 
  },
  community: { 
    top: '42%', left: '25%', right: '25%', 
    height: '70px', borderRadius: '12px' 
  },
  pot: { 
    top: '25%', left: '38%', right: '38%', 
    height: '30px', borderRadius: '8px' 
  },
  cards: { 
    bottom: '8%', left: '38%', right: '38%', 
    height: '70px', borderRadius: '12px' 
  },
  timer: { 
    top: 'calc(env(safe-area-inset-top, 0px) + 6px)', 
    left: 'calc(env(safe-area-inset-left, 0px) + 50px)', 
    width: '120px', height: '24px', borderRadius: '8px' 
  },
  table: { 
    top: '12%', left: '10%', right: '22%', 
    bottom: '10%', borderRadius: '50%' 
  },
};
```

**Dynamic dialog positioning near highlights:**

Instead of using only `position` prop, derive placement from `highlight`:
- `exit`, `audio`, `timer` highlights: dialog at center-bottom area
- `actions` highlight: dialog at center-left area
- `community`, `pot`, `table` highlights: dialog at bottom area
- `cards` highlight: dialog at top area
- No highlight / center: stay centered

The dialog positioning logic:
```typescript
function getDialogPosition(highlight?: string, fallbackPosition?: string) {
  if (!highlight) return fallbackPosition || 'center';
  switch (highlight) {
    case 'exit': case 'audio': case 'timer': return 'bottom';
    case 'actions': return 'center-left';  // new position variant
    case 'cards': return 'top';
    default: return 'bottom';
  }
}
```

Add a new CSS position variant `center-left` that places the dialog on the left side of the screen (away from the right-side action panel).

### File 3: `src/pages/LearnPoker.tsx`

No changes needed beyond what's already there -- the `guardedAction` wrapper reads `allowedAction` from the hook, and the hook fix will make it persistent.

---

## Files Changed

| File | Change |
|------|--------|
| `src/hooks/useTutorialGame.ts` | Add `pendingRequiredAction` state; persist after coach dismiss; clear on correct action; export as `allowedAction` |
| `src/components/poker/CoachOverlay.tsx` | Fix all highlight positions for landscape; add dynamic dialog positioning near highlights |

## NOT Changed
- `PokerTablePro.tsx` -- no modifications
- `BettingControls.tsx` -- no modifications
- `LearnPoker.tsx` -- no modifications needed (already uses `guardedAction`)
- Bottom navigation, layout, styles, other pages
- Tutorial lesson content, bot scripts
- Edge functions, database
