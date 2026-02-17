

# Pixel-Perfect Player Profile Redesign

## Detailed Analysis: Reference vs Current

After examining the reference image closely, here are all the differences that need to be fixed:

### 1. Avatar Frame -- WRONG STYLE
**Reference:** Thick dark charcoal/metallic ring border (dark grey, almost black)
**Current:** Colorful gradient border with bright colors (`3px solid color-mix(in srgb, ${color} 60%, white)`)
**Fix:** Replace the colorful border with a thick (4px) dark charcoal border (`hsl(0 0% 15%)`) with a subtle inner shadow for the metallic look.

### 2. Cards -- Z-ORDER PARTIALLY WRONG
**Reference:** Cards are in front of the avatar BUT behind the nameplate bar. The nameplate overlaps both the avatar and the card bottoms.
**Current:** Cards are at `zIndex: 3`, nameplate has no z-index (defaults to auto). Both cards and nameplate are siblings.
**Fix:** Keep cards at `zIndex: 3`. Raise the nameplate to `zIndex: 4` so it paints on top of the card bottoms, matching the reference where the nameplate covers the lower portion.

### 3. Nameplate -- WRONG SHAPE AND POSITION
**Reference:** Wide, fully rounded pill shape (rounded on all sides, not just bottom). It overlaps/connects with the bottom of the avatar circle -- no gap. Contains "You" (white, centered) and "93,240" (white/light, centered) on two lines.
**Current:** Only rounded at the bottom (`rounded-b-lg`), has a `mt-0.5` gap, uses `borderTop: none`. Name is gold for hero.
**Fix:** Make the nameplate a full rounded pill (`rounded-full` or `rounded-xl`), remove the top gap by using negative margin (`-mt-3`) so it tucks under the avatar. Make all text white (not gold). Widen it slightly. Set `zIndex: 4` so it sits in front of cards.

### 4. Level Badge -- MISSING FIRE ANIMATION
**Reference:** The "19" badge has orange/red flames radiating outward around it -- an animated fire effect.
**Current:** Plain dark circle with a thin gold border. No animation.
**Fix:** Add a CSS keyframe animation that creates a pulsing fire/ember glow effect around the badge. Use an orange-red radial gradient or box-shadow animation to simulate flames. The badge itself stays the same (dark circle, white number), but gets a glowing animated ring.

### 5. Country Flag -- MISSING
**Reference:** Small rectangular Union Jack at the avatar's bottom-right.
**Current:** Not implemented at all.
**Fix:** Create a `CountryFlag.tsx` component using emoji flags (converting 2-letter ISO code to regional indicator emoji). Position absolute at bottom-right of the avatar, same size as the level badge. Add `country_code` column to profiles table.

### 6. Status Dot -- SHOULD BE REMOVED
**Reference:** No green/red status dot visible.
**Current:** A colored status dot at bottom-right.
**Fix:** Remove the status dot from `PlayerAvatar.tsx`. The bottom-right position is now taken by the country flag.

## Files to Change

### `src/components/poker/PlayerAvatar.tsx`
- Replace colorful gradient border with dark charcoal metallic border
- Remove the status dot (bottom-right)
- Add `countryCode` prop
- Render `CountryFlag` at bottom-right (where status dot was)
- Keep `LevelBadge` at bottom-left

### `src/components/common/LevelBadge.tsx`
- Add animated fire/ember glow effect using CSS keyframes
- Keep the badge itself the same (dark circle, gold border, white number)
- Add pulsing orange/red shadow animation around the badge

### `src/components/poker/PlayerSeat.tsx`
- **Nameplate:** Change to full rounded pill shape, negative top margin to overlap avatar bottom, set `zIndex: 4` (above cards)
- **Text colors:** All white (remove gold color for hero name)
- **Nameplate width:** Wider `min-w-[90px]`

### `src/components/poker/CountryFlag.tsx` (NEW)
- Takes `countryCode` (2-letter ISO) prop
- Renders flag emoji in a small container
- Positioned absolute bottom-right of avatar

### `tailwind.config.ts`
- Add `fire-glow` keyframe animation for the level badge ember effect

### Database
- Add `country_code TEXT` column to `profiles` table

## Technical: Z-Index Layering (Fixed)

```text
Layer 1 (z-[1]): Avatar body (profile pic)
Layer 2 (z-[2]): Active player gold ring / All-in ring
Layer 3 (z-[3]): Cards (fanned on top of avatar)
Layer 4 (z-[4]): Nameplate bar (on top of everything)
Layer 10 (z-[10]): Level badge + Country flag (on avatar edge)
```

## Summary of Visual Changes
- Dark metallic avatar frame (no more colorful borders)
- Cards in front of avatar, behind nameplate
- Wide pill-shaped nameplate overlapping avatar bottom
- Fire/ember animation on level badge
- Country flag at bottom-right of avatar
- Status dot removed

