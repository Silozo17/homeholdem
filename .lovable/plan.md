

# Fix Player Profile to Match Reference

## Problems Identified (Reference IMG_3984 vs Current IMG_3985)

### 1. Level Badge and Country Flag Hidden Behind Nameplate
The badge and flag are children of `PlayerAvatar` (which has `z-[2]`). CSS stacking contexts mean their `z-10` only applies within that parent -- so the nameplate at `z-[4]` paints over them completely.
**Fix:** Move `LevelBadge` and `CountryFlag` out of `PlayerAvatar` and render them in `PlayerSeat.tsx` as siblings positioned absolutely at `z-[5]`, anchored to the avatar's bottom-left and bottom-right edges.

### 2. Avatar Too Small Relative to Cards
Avatar `xl` = 80px. Card `xl` = 56x80px. In the reference, the avatar is clearly the dominant element with cards peeking above it. The avatar needs to be bigger.
**Fix:** Increase `xl` avatar from `w-20 h-20` (80px) to `w-[88px] h-[88px]` (88px). This makes the avatar clearly larger than the cards.

### 3. Card Markings Too Small
Reference shows large, bold rank letters (A, K, 7) that nearly fill the card face. Current `xl` uses `text-sm` for rank (14px) and `text-2xl` for center suit.
**Fix:** Bump `xl` rank to `text-base` (16px), suit to `text-sm` (14px), and center suit to `text-3xl`. Makes the card face bolder and more readable like the reference.

### 4. Cards Slightly Too Large
User confirmed cards are close but slightly oversized.
**Fix:** Reduce `xl` card from `w-14 h-[80px]` to `w-[50px] h-[72px]` -- a small trim.

### 5. Turn Timer Circle Overlapping Cards
The SVG timer ring wraps the avatar center at `z-10`, painting over the cards and everything else.
**Fix:** Integrate the timer into the nameplate pill. When it is the player's turn, the nameplate border becomes a gold animated countdown line (using a CSS conic-gradient that sweeps). Keep the timer logic (countdown, onTimeout, onLowTime) but render a thin gold progress border around the nameplate instead of a big circle over the avatar.

### 6. Card Fan Angle
Reference shows a wider spread between the two cards (~14-15 degrees each).
**Fix:** Increase rotation from 10deg to 14deg.

## Files to Change

### `src/components/poker/PlayerAvatar.tsx`
- Increase `xl` size to `w-[88px] h-[88px]`
- Remove `LevelBadge` and `CountryFlag` rendering (move to PlayerSeat)
- Remove `level` and `countryCode` props

### `src/components/poker/PlayerSeat.tsx`
- Render `LevelBadge` at `z-[5]` positioned at avatar's bottom-left edge
- Render `CountryFlag` at `z-[5]` positioned at avatar's bottom-right edge
- Remove circular `TurnTimer` from avatar area
- Add turn timer as a gold conic-gradient border on the nameplate pill (sweeping countdown)
- Increase card fan angle from 10 to 14 degrees
- Use the timer's elapsed/duration state to drive the nameplate border animation

### `src/components/poker/CardDisplay.tsx`
- Reduce `xl` dimensions to `w-[50px] h-[72px]`
- Increase `xl` text sizes: rank `text-base`, corner suit `text-sm`, center suit `text-3xl`

## Revised Z-Index Layering

```text
z-[1]: Avatar body (profile picture)
z-[2]: Active player gold ring / All-in ring
z-[3]: Cards (fanned over avatar top)
z-[4]: Nameplate pill (overlaps card bottoms + avatar bottom)
z-[5]: Level badge + Country flag (on avatar edges, above nameplate)
```

## Turn Timer Redesign
Instead of a large SVG circle overlaying the avatar and cards, the timer becomes a conic-gradient border on the nameplate pill that sweeps from full gold to empty as time runs out, transitioning gold to orange to red. This keeps the timer visible without occluding cards or badges.

