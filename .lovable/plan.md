
# Make Human Player Cards Bigger and Lower Nameplates

## Changes in `src/components/poker/PlayerSeat.tsx`

### 1. Double the human card size
- Current: `humanCardSize` is `'sm'` (compact) or `'2xl'` (normal)
- New: `'lg'` (compact) or `'2xl'` (normal) -- this roughly doubles the compact size from `w-7 h-10` to `w-12 h-[68px]`
- For normal mode, bump to a custom scale using `transform: scale(1.5)` on the card container, since `'2xl'` is already the largest defined size

### 2. Lower all nameplates by 2px
- Change the nameplate margin from `-mt-1` to `mt-0` (adds ~2px gap) so the active player spotlight glow no longer covers the player name

## File to Modify

| File | Change |
|------|--------|
| `src/components/poker/PlayerSeat.tsx` | Increase `humanCardSize` and adjust nameplate margin |

## Technical Details

**Card size change (line 38)**:
- From: `const humanCardSize = compact ? 'sm' : '2xl';`
- To: `const humanCardSize = compact ? 'lg' : '2xl';`
- Additionally, add `transform: scale(1.3)` to the human cards container to push the size up further regardless of mode

**Nameplate spacing (line 126)**:
- From: `'-mt-1'` on the nameplate div
- To: `'mt-0.5'` to push the nameplate 2px lower and clear the active glow ring
