

## Make the Raise Menu Bigger

The raise panel (quick bet buttons + slider) is currently too small and hard to tap on mobile. Here are the specific size increases:

### Portrait Mode (bottom bar)

| Element | Current | New |
|---------|---------|-----|
| Quick bet buttons | `text-[9px] py-1 px-1` | `text-[11px] py-1.5 px-2` |
| Quick bet row gap | `gap-1` | `gap-1.5` |
| Raise panel padding | `px-2 py-2` | `px-3 py-3` |
| Slider amount text | `text-[10px] w-14` | `text-xs w-16` |
| Slider row gap | `gap-2` | `gap-3` |
| Slider track | default height | Add `h-6` class for larger touch target |

### Landscape Mode (right-thumb panel)

| Element | Current | New |
|---------|---------|-----|
| Panel width | `w-[130px]` | `w-[160px]` |
| Quick bet buttons | `text-[8px] py-0.5 px-1.5` | `text-[10px] py-1 px-2` |
| Quick bet row gap | `gap-1` | `gap-1.5` |
| Raise panel padding | `px-2 py-2` | `px-3 py-3` |
| Amount text | `text-[9px]` | `text-[11px]` |

### Technical Details

**File**: `src/components/poker/BettingControls.tsx`

All changes are CSS class adjustments only -- no logic changes, no layout restructuring. The buttons, slider, and text simply get larger tap targets and more readable font sizes.

