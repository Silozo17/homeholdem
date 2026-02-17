

# Redesign: Cards ON TOP of Avatar (Matching Reference)

## Clarification of Layout

The reference image shows cards **overlaying / in front of** the avatar, not behind it. The avatar peeks out from underneath the cards. This is the opposite of what was previously attempted.

### Visual Layout (from reference)

```text
         ┌─────────┐  ┌─────────┐
         │  Card 1  │  │  Card 2  │    <-- Cards IN FRONT, on top of avatar
         │ (tilted) │  │ (tilted) │        z-index HIGHER than avatar
         └───┬──────┘  └──────┬───┘
             │    ┌──────┐    │
             └────│Avatar│────┘       <-- Avatar BEHIND cards
                  │(photo│
            [19]  │  /   │  [flag]
                  └──┬───┘
              ┌──────┴──────┐
              │    "You"    │          <-- Dark nameplate
              │   93,240    │
              └─────────────┘
```

### States

- **Hero (current user):** Always sees cards on top of their avatar
- **Opponents during play:** Only avatar + nameplate visible (no cards)
- **Opponents at showdown:** Cards appear on top of their avatar (same layout as hero)
- **Folded/Eliminated:** Greyed out, no cards

## Changes in `PlayerSeat.tsx`

### 1. Reposition cards ON TOP of avatar

Both `humanCards` and `opponentShowdownCards` will be rendered **after** the avatar in the DOM and given a **higher z-index** (`z-[3]`), so they paint on top of the profile picture.

Cards will be:
- Absolutely positioned, centered on the avatar
- Offset upward so they overlap the top ~60% of the avatar circle (the bottom of the cards aligns roughly with the avatar center)
- Fanned with ~10-12 degree tilt (currently only 3 degrees -- increase for the dramatic fan in the reference)
- Slightly overlapping each other (negative margin)

### 2. Unify card rendering for hero and opponents

Both hero and opponent cards use the same positioning logic (centered on avatar, fanned, on top). The only differences:
- Hero: sequential deal reveal animation
- Opponents: only visible at showdown with flip animation

### 3. Specific code changes

**Human cards block (lines 88-106):**
- Change `zIndex: 1` to `zIndex: 3` (on top of avatar which is z-[2])
- Change positioning from `bottom: calc(30% + 9px)` to `top: -30%` (cards peek above the avatar)
- Change `left-1/2 -translate-x-1/2` centering to be relative to the avatar container
- Increase rotation from 3deg to ~10deg for each card

**Opponent showdown cards block (lines 71-85):**
- Keep `zIndex: 2` or raise to `3` (already overlays avatar)
- Adjust positioning to match the same fan layout as hero cards
- Increase rotation from 3deg to ~10deg

**Avatar wrapper:**
- Ensure avatar stays at `z-[1]` or default z so cards paint on top

### 4. Card sizing

Use the same card size for both hero and opponents -- the reference shows large, prominent cards for the hero view. Keep `humanCardSize` (`2xl` / `md` compact) for all visible cards.

## No Other Files Changed

This is purely a z-index and positioning fix within `PlayerSeat.tsx`. The avatar, card display, and other components remain unchanged. The country flag and other redesign elements from the broader plan are separate work.

## File Modified

- `src/components/poker/PlayerSeat.tsx` -- reposition cards to overlay on top of avatar with higher z-index, increase fan angle, unify hero/opponent card layout

