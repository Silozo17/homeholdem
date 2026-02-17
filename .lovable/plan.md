

# Move & Resize Action Buttons

## 1. Fold / Check / Raise buttons -> bottom-right, 25% smaller

**Current**: In mobile landscape, the betting panel is vertically centered on the right (`top: 50%, -translate-y-1/2`). In desktop landscape, it sits at `bottom: 12px, right: 10px`.

**Change**: Move the mobile landscape panel to bottom-right (anchored to `bottom` instead of `top: 50%`). Reduce only the main action buttons (Fold, Check/Call, Raise) by 25% -- from `h-11` to `h-8` and text from `text-sm` to `text-xs`. The raise slider/quick-bet menu keeps its current size.

### Files:
- `src/components/poker/OnlinePokerTable.tsx` (lines 1162-1169): Change from `top-1/2 -translate-y-1/2` to `bottom` anchored positioning with safe-area padding
- `src/components/poker/BettingControls.tsx`: In landscape mode, reduce action button height from `h-11` to `h-8` and text from `text-sm` to `text-xs`. Leave the raise slider panel (`showRaiseSlider` block) untouched.

## 2. Pre-action buttons (Check/Fold, Call Any, Check) -> closer to right edge

**Current**: Positioned at `right: calc(env(safe-area-inset-right) + 10px)`, `top: calc(env(safe-area-inset-top) + 48px)` (line 1210).

**Change**: Keep the `right: 10px` from safe-area but move the buttons to the bottom-right area instead of top-right, aligning them above the main action buttons area. The `items-end` alignment on the `PreActionButtons` flex container already right-aligns the buttons, so this just needs the positioning tweak to ensure exactly 10px from the right edge.

### Files:
- `src/components/poker/OnlinePokerTable.tsx` (line 1210): Update the right padding to ensure exactly 10px from screen edge: `right: 'calc(env(safe-area-inset-right, 0px) + 10px)'` (already correct, but verify no extra offset)

### Technical Details

**BettingControls.tsx landscape buttons (reduce 25%)**:
- `h-11` -> `h-8`
- `text-sm` -> `text-xs`  
- Icon size `14` -> `12`
- Gap between buttons `gap-2` -> `gap-1.5`

**OnlinePokerTable.tsx mobile landscape panel**:
```
// Before: centered vertically
top-1/2 -translate-y-1/2

// After: bottom-right corner
bottom: calc(env(safe-area-inset-bottom) + 12px)
right: 0
```

