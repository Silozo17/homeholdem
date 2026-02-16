

# Fix Poker Table: Make It Look Like a Real Premium Game

## What's Wrong Right Now

Looking at the current screenshot vs your reference images, here are the specific failures:

1. **Table is tiny and floating** -- The table wrapper is `min(62vh, 460px)` tall with `aspect-ratio: 16/9`, making it a small rectangle in the middle of a huge dark void. The reference games have the table filling 70-80% of the screen.

2. **Seats are OUTSIDE the table** -- The ellipse push distance (`PUSH_DISTANCE = 6`) combined with a small ellipse radius pushes seats into the dead space around the table. In every reference image, seats sit ON or overlapping the rail, not floating in empty space.

3. **Visible white rectangle** -- `TableFelt.tsx` has a `bg-background` div behind the table image, creating an ugly light-colored rectangle visible around the table asset.

4. **Dealer in a separate grid row** -- The dealer sits in its own 52px row above the table zone, disconnected from the table scene. In the reference images, the dealer is AT the top of the table, visually part of the scene.

5. **"You" player is below the table** -- The human seat at 90 degrees (bottom of ellipse) gets pushed even further down, completely off the table. In reference games, the human seat is at the bottom EDGE of the table.

6. **No card dealing animation** -- Cards just appear. The reference games show cards flying from the dealer to each seat.

7. **Game moves too fast** -- No pacing between bot actions; everything happens instantly.

## The Fix

### Architecture: Remove the 4-row grid, use a single full-screen scene

The 4-row grid (header / dealer / table / actions) is the root cause of the layout problem. It creates artificial vertical sections that separate the dealer from the table and leave huge gaps.

**New approach**: One full-screen container with the table wrapper taking up most of the space. Header and action bar are absolutely positioned overlays on top.

### File Changes

**1. `src/components/poker/PokerTablePro.tsx` (major rewrite)**

- Remove the CSS grid layout entirely
- Use a single `fixed inset-0` container
- Table wrapper becomes the dominant element: `width: min(96vw, 800px)`, `height: auto`, `aspect-ratio: 16/9`, centered vertically with slight upward bias
- ALL elements (seats, pot, cards, dealer) are positioned as children of the table wrapper using `position: absolute` with percentage coordinates
- Header bar: `position: absolute; top: 0` overlay
- Action bar: `position: absolute; bottom: 0` overlay
- Dealer: positioned INSIDE the table wrapper at `top: 2%, left: 50%`
- Human ("You") seat: positioned at bottom of table wrapper `top: 88%, left: 50%`
- Remove the separate dealer HUD row completely

**2. `src/lib/poker/ui/seatLayout.ts` (rewrite ellipse params)**

The ellipse needs to be LARGER so seats land ON the rail, not outside it:

- Portrait ellipse: `cx: 50, cy: 50, rx: 42, ry: 40` (was rx:34, ry:30 -- way too small)
- Landscape ellipse: `cx: 50, cy: 48, rx: 44, ry: 38`
- Change `PUSH_DISTANCE` from 6 to 2 (seats should be ON the rail, barely outside)
- Adjust angle maps so bottom seat (human) is at ~88-90% Y, top seats at ~8-12% Y
- Clamp Y to `5..95` instead of `2..98`

**3. `src/components/poker/TableFelt.tsx` (fix the white rectangle)**

- Remove the `bg-background rounded-3xl` backing div -- it creates the visible white rectangle
- Replace with transparent or dark backing: `bg-transparent` or `bg-black`
- The table PNG already has its own background baked in

**4. `src/components/poker/DealerCharacter.tsx` (no structural changes)**

- Keep as-is, but it will now be positioned INSIDE the table wrapper at the top center, not in a separate row

**5. `src/components/poker/PlayerSeat.tsx` (minor sizing adjustment)**

- Cards currently render below the avatar in a column layout. For the human seat at the bottom of the table, cards can overlap the table edge -- this is fine and matches reference apps
- No major changes needed

**6. `src/hooks/usePokerGame.ts` (add pacing delays)**

- Add a configurable delay between bot actions (e.g., 800-1200ms per bot turn) so the game doesn't feel instant
- Add a delay before dealing community cards (flop/turn/river) of ~500ms
- This makes the game feel more like a real poker table

**7. `src/components/poker/CardDisplay.tsx` (deal animation)**

- The `animate-card-deal-deck` animation already exists but cards appear in-place
- Add a CSS animation that starts from the dealer position (top-center of table) and moves to the card's final position
- Use `dealDelay` prop (already exists) for staggered dealing

### Layout Geometry (Portrait 390x844)

```text
+------------------------------------------+
| [<] [#1 50/100] [vol]                    |  <- absolute overlay, top, z:40
|                                          |
|  +----TABLE WRAPPER (96vw, 16:9)------+  |
|  |        [Dealer @ 50%, 4%]          |  |
|  |                                    |  |
|  | [Seat2       [Seat3]      Seat4]   |  |  <- seats ON the oval rail
|  | @8%,45%      @50%,8%     @92%,45%  |  |
|  |                                    |  |
|  |         [Pot @ 50%,35%]            |  |
|  |       [Cards @ 50%,48%]            |  |
|  |        [Phase @ 50%,58%]           |  |
|  |                                    |  |
|  | [Seat5                    Seat6]   |  |
|  |                                    |  |
|  |      [Human @ 50%, 92%]            |  |  <- human seat at bottom EDGE
|  +------------------------------------+  |
|                                          |
|  [YOUR TURN]                             |
|  [Fold] [Call 100] [Raise]               |  <- absolute overlay, bottom, z:50
+------------------------------------------+
```

### Z-Index Model (no changes to z.ts)

The existing z-index constants are correct. The fix is entirely about spatial positioning.

### What This Does NOT Change

- Card display styling, pot display, winner overlay -- all stay the same
- Sound system, game logic -- untouched
- No new features added
- No multiplayer changes

### Implementation Order

1. Fix `TableFelt.tsx` -- remove white background rectangle
2. Rewrite `seatLayout.ts` -- larger ellipse, smaller push distance, correct angles
3. Rewrite `PokerTablePro.tsx` -- remove grid, use single scene container with overlays
4. Add bot action delays in `usePokerGame.ts` for pacing
5. Verify with portrait + landscape screenshots

