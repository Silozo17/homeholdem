

# Fix Tutorial Controls Visibility and Clickability

## Issues Found

### Issue 1: Intro step "actions" highlight doesn't show betting controls
In `LearnPoker.tsx` line 134, `forceShowControls` only checks `currentStep?.highlight === 'actions'`. During intro steps, `currentStep` is null (it's populated only for scripted steps). The intro step on line 110 of tutorial-lessons.ts says "When it's your turn, action buttons appear at the bottom" with `highlight: 'actions'`, but the controls never render.

**Fix:** Also check `currentIntroStep?.highlight === 'actions'` in the `forceShowControls` prop.

### Issue 2: Buttons not clickable during `require_action` steps  
The CoachOverlay renders a full-screen dim `div` with `pointer-events-auto` at `z-50`. The BettingControls render at `Z.ACTIONS = 50` (same z-index). The dim overlay captures all pointer events, blocking clicks on the buttons underneath.

**Fix:** During `require_action` steps, the dim overlay must NOT block the action buttons area. Two changes:
1. Change the CoachOverlay's root container from `z-50` to `z-[45]` so it sits BELOW the action controls (z-50), OR
2. Better: when `isRequireAction` is true, make the dim overlay `pointer-events-none` so clicks pass through to the buttons beneath. The user shouldn't be able to dismiss by tapping the overlay during require_action anyway.

The cleanest fix is option 2: change the dim overlay to `pointer-events-none` when `isRequireAction` is true.

### Issue 3: Scan all lessons for similar problems
Reviewed all 10 lessons' scripted steps. Every `require_action` step uses `highlight: 'actions'` which triggers the same clickability bug. The fix to CoachOverlay applies globally, fixing all lessons at once.

---

## Changes

### File: `src/pages/LearnPoker.tsx` (line 134)

Change `forceShowControls` to also check intro steps:

```tsx
// Before
forceShowControls={!!currentStep?.highlight && currentStep.highlight === 'actions'}

// After
forceShowControls={
  (!!currentStep?.highlight && currentStep.highlight === 'actions') ||
  (!!currentIntroStep?.highlight && currentIntroStep.highlight === 'actions')
}
```

### File: `src/components/poker/CoachOverlay.tsx` (line 97)

Make the dim overlay `pointer-events-none` during `require_action` so the action buttons beneath remain clickable:

```tsx
// Before
<div className="fixed inset-0 bg-black/25 pointer-events-auto" onClick={isRequireAction ? undefined : onDismiss} />

// After
<div
  className={cn("fixed inset-0 bg-black/25", isRequireAction ? "pointer-events-none" : "pointer-events-auto")}
  onClick={isRequireAction ? undefined : onDismiss}
/>
```

### No other files changed
- Bottom navigation: untouched
- BettingControls: untouched  
- PokerTablePro: untouched
- Tutorial lessons data: untouched

