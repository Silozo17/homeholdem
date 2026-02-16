

# Make Human Player Cards Bigger and Fan Behind Profile Pic

## Problem
Currently, human player cards use `sm` size (`w-7 h-10` = 28x40px) and render below the nameplate in a flat row. They're too small to read comfortably.

## Solution
Reposition the human player's cards to fan out BEHIND the avatar, with the tops of the cards protruding above the profile picture. Use `lg` size cards for much better readability.

### Changes to `src/components/poker/PlayerSeat.tsx`

Move the `humanCards` element from below the nameplate to INSIDE the avatar container, positioned absolutely behind the avatar. The two cards will be rotated in a fan formation (card 1 rotated -15deg, card 2 rotated +15deg) and shifted upward so the top portions peek above the avatar circle.

- Card size: change from `sm` to `lg` (`w-12 h-[68px]`)
- Position: `absolute`, centered horizontally, shifted up so ~30px of card tops show above the avatar
- Z-index: set to 1 (behind the avatar which is z-index 2), so cards fan behind the profile pic
- Fan rotation: first card `-15deg`, second card `+15deg`, with slight horizontal offset
- The avatar itself gets `z-index: 2` so it sits on top of the fanned cards

### Visual result
```text
       ┌──┐   ┌──┐       <-- card tops peeking above
        \ │   │ /
         ┌─────────┐
         │ (avatar) │     <-- avatar sits on top of cards
         └─────────┘
         │ Name    │
         │ $10,000 │
         └─────────┘
```

### Technical Details

**`src/components/poker/PlayerSeat.tsx`**:
1. Change `cardSize` for human from `sm` to `lg`
2. Move `humanCards` rendering from line 145 (below nameplate) into the avatar `<div className="relative">` block (line 84)
3. Position with: `absolute left-1/2 -translate-x-1/2` and `bottom: 30%` (so tops protrude above)
4. Each card gets `transform: rotate(Xdeg)` for fan effect
5. Set z-index to 1 on the cards container, and ensure avatar has z-index 2

**`src/components/poker/PlayerAvatar.tsx`**: Add `relative z-[2]` to the avatar wrapper so it renders on top of the fanned cards behind it.

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/poker/PlayerSeat.tsx` | Move human cards behind avatar as a fan, increase to `lg` size |
| `src/components/poker/PlayerAvatar.tsx` | Add `z-[2]` to ensure avatar renders above cards |
