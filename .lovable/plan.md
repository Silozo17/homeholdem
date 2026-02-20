
# Fix Pointer Hand Precision for Action Buttons and Raise Menu

## Problem
From the screenshots:
1. The pointer hand points at the general "actions" area instead of the specific **Raise button** at the bottom of the action stack.
2. When the raise slider/presets menu opens, the pointer stays in the same spot instead of moving to point at the **presets panel** (with a right-pointing hand from the left side).

## Solution

### 1. Add `onSliderToggle` callback to BettingControls
**File: `src/components/poker/BettingControls.tsx`**
- Add optional prop: `onSliderToggle?: (open: boolean) => void`
- Call it whenever `showRaiseSlider` changes (inside `handleRaiseTap` and the cancel button)

### 2. Track slider state in PokerTablePro
**File: `src/components/poker/PokerTablePro.tsx`**
- Add prop: `onRaiseSliderToggle?: (open: boolean) => void`
- Pass it to `BettingControls` as `onSliderToggle`

### 3. Track slider state in LearnPoker and pass to CoachOverlay
**File: `src/pages/LearnPoker.tsx`**
- Add `const [raiseSliderOpen, setRaiseSliderOpen] = useState(false)`
- Pass `onRaiseSliderToggle={setRaiseSliderOpen}` to `PokerTablePro`
- Pass `raiseSliderOpen={raiseSliderOpen}` to `CoachOverlay`

### 4. Update CoachOverlay pointer logic and positions
**File: `src/components/poker/CoachOverlay.tsx`**

Add new prop `raiseSliderOpen?: boolean`.

**Update POINTER_HANDS** -- make `actions` point precisely at the Raise button (the bottom-most 37px-tall button in the landscape stack), and add a new `raise_presets` target:

| Target | Emoji | Position (CSS) | Description |
|--------|-------|----------------|-------------|
| `actions` | `👉` | `right: calc(safe-area + 195px)`, `bottom: calc(safe-area + 22px)` | Points RIGHT at the Raise button from the left side, vertically centered on the 37px button |
| `raise_presets` | `👉` | `right: calc(safe-area + 195px)`, `bottom: calc(safe-area + 190px)` | Points RIGHT at the presets panel from the left side |

**Update pointer selection logic**: When `isRequireAction` and `raiseSliderOpen`, use `raise_presets` instead of `actions`.

```text
activeHighlight logic:
  if isRequireAction:
    if raiseSliderOpen -> 'raise_presets'
    else -> 'actions'  
  else:
    use rawHighlight from step/intro
```

### Summary of file changes

| File | Change |
|------|--------|
| `src/components/poker/BettingControls.tsx` | Add `onSliderToggle` prop, call it on open/close |
| `src/components/poker/PokerTablePro.tsx` | Add `onRaiseSliderToggle` prop, pass to BettingControls |
| `src/pages/LearnPoker.tsx` | Track `raiseSliderOpen` state, pass to CoachOverlay |
| `src/components/poker/CoachOverlay.tsx` | Add `raiseSliderOpen` prop, add `raise_presets` target, fix `actions` to point at Raise button precisely |

## What does NOT change
- Tutorial lesson messages
- Bottom navigation
- Game logic / engine
- Database
- Highlight ring positions (those are correct)
