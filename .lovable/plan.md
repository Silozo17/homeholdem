
# Make Human Player Cards 2x Bigger and Tighter Fan

## Changes

### `src/components/poker/CardDisplay.tsx`
Add a new `2xl` size class that is double the current `lg` size:
- Current `lg`: `w-12 h-[68px]` (48x68px)
- New `2xl`: `w-[96px] h-[136px]` (96x136px — exactly 2x)
- Also add corresponding text sizes for the `2xl` tier in the `textSizes` map

### `src/components/poker/PlayerSeat.tsx`
- Change `humanCardSize` from `lg` to `2xl`
- Tighten the fan: reduce rotation from +/-15deg to +/-8deg and reduce horizontal offset from +/-8px to +/-4px, so the two cards overlap more while still showing both ranks/suits
- Adjust vertical position (`bottom`) so the tops still protrude well above the avatar

## Files to Modify

| File | Change |
|------|--------|
| `src/components/poker/CardDisplay.tsx` | Add `2xl` size class and text sizes |
| `src/components/poker/PlayerSeat.tsx` | Use `2xl` cards, tighten fan rotation and offset |
