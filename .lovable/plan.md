

# Adjust Human Player Cards: Smaller and Tighter Fan

## Changes in `src/components/poker/PlayerSeat.tsx`

### 1. Reduce card size
- Change `humanCardSize` back from `'lg'` to `'md'` in compact mode (the common mobile/landscape case)
- Reduce the scale transform from `scale(1.3)` to `scale(1.0)` -- the `'md'` size cards at 1x scale will be noticeably smaller than the current oversized cards but still clearly visible

### 2. Tighter fan overlap
- Reduce the rotation angles from +/-8deg to +/-5deg so cards angle less
- Reduce the translateX spread from +/-4px to +/-1px so cards overlap more closely, creating a tight fan

## File to Modify

| File | Change |
|------|--------|
| `src/components/poker/PlayerSeat.tsx` | Reduce `humanCardSize` to `'md'` (compact), remove scale(1.3), tighten fan rotation and spread |

## Technical Details

**Line 38** (card size):
- From: `const humanCardSize = compact ? 'lg' : '2xl';`
- To: `const humanCardSize = compact ? 'md' : '2xl';`

**Line 63** (container transform):
- From: `transform: 'translateX(-50%) scale(1.3)'`
- To: `transform: 'translateX(-50%) scale(1.0)'`

**Lines 67-68** (per-card transforms):
- From: `rotate(${i === 0 ? -8 : 8}deg) translateX(${i === 0 ? -4 : 4}px)`
- To: `rotate(${i === 0 ? -5 : 5}deg) translateX(${i === 0 ? -1 : 1}px)`

