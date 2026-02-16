

# Poker Table Visual Overhaul: Reference-Inspired Redesign

## Overview

Redesign the poker table experience to match the reference image's aesthetic: larger table, avatar-centric player design with cards hidden until showdown, and upgraded sound and animation systems.

---

## 1. Hide Opponent Cards Until Showdown

**Current behavior**: Bot cards show face-down card backs during play.
**New behavior**: Opponents show NO cards at all during play. Only the human player sees their own hole cards. At showdown, opponent cards appear with a 3D flip reveal animation replacing/overlapping the avatar.

### Changes
- **`src/components/poker/PlayerSeat.tsx`**: When `showCards` is false AND player is not human, hide the cards element entirely (no face-down cards). Only render cards when `showCards` is true (showdown) or player is human.
- At showdown, cards animate in with a 3D flip effect overlaying the avatar circle area.

---

## 2. Redesigned Player Seat (Avatar-Centric Like Reference)

Inspired by the reference: circular avatar cropped at bottom by a dark info bar showing name + chip count.

### New PlayerSeat Layout
```text
  ┌──────────────┐
  │   (avatar     │  <-- Circular avatar, larger (w-14 h-14)
  │    circle)    │
  ├──────────────┤
  │ Name         │  <-- Dark semi-transparent bar
  │ $10,000      │  <-- Gold chip count
  └──────────────┘
```

- Avatar is a full circle with a thick ring for active player (gold animated) or all-in (red pulse).
- Below avatar: a compact dark "nameplate" bar with name + chips, styled with rounded-bottom corners and semi-transparent dark background.
- At showdown: the two hole cards appear overlapping the top of the avatar (like the reference image shows cards fanning above/beside the avatar).
- Action badges (Fold, Raise, Check) appear as small floating tags near the nameplate.
- The turn timer ring wraps the avatar circle.

### Files
- **`src/components/poker/PlayerSeat.tsx`**: Complete redesign to avatar-centric layout with nameplate bar. Remove the current vertical/horizontal stack system. All seats use the same layout (avatar + nameplate below), with cards appearing above/overlapping at showdown.
- **`src/components/poker/PlayerAvatar.tsx`**: Increase default sizes, add thicker active ring, improve gradient quality.

---

## 3. Larger Table (85% Screen Coverage)

### Changes
- **`src/components/poker/PokerTablePro.tsx`**: Change table wrapper width from `min(78vw, 900px)` to `min(88vw, 1100px)` and max-height from `70vh` to `82vh`. This makes the table dominate the screen.
- Community cards stay centered within the table at `top: 44%` (adjust if needed to `top: 48%` for visual center).
- Pot display moves up slightly to `top: 32%`.

---

## 4. Community Cards Centered on Table

Currently cards are at `top: 44%` which is correct. Ensure they remain horizontally and vertically centered within the felt area. Increase card size from `lg` to a new `xl` size for community cards to match the reference's prominent card display.

### Changes
- **`src/components/poker/CardDisplay.tsx`**: Add `xl` size variant (`w-14 h-[80px]`) for community cards.
- **`src/components/poker/PokerTablePro.tsx`**: Use `xl` size for community cards.

---

## 5. Seat Position Adjustments

With the larger table, seat positions need slight adjustments to stay on the rail edge.

### Changes
- **`src/lib/poker/ui/seatLayout.ts`**: Adjust landscape seat coordinates slightly outward to account for the bigger table wrapper. Fine-tune Y seat (hero) to `yPct: 94` and top seats to `yPct: 6` for more spread.

---

## 6. Enhanced Sound Effects

Replace basic oscillator beeps with richer, multi-layered synthesized sounds.

### Changes to `src/hooks/usePokerSounds.ts`

| Sound | Current | Improved |
|-------|---------|----------|
| `shuffle` | Single bandpass noise | Layered noise bursts (3 rapid bursts) simulating card riffle |
| `deal` | Single 1200Hz tone | Quick "snap" - noise burst + high click |
| `flip` | Single noise burst | 3D pan sweep + whoosh noise for card reveal |
| `chipClink` | 2 sine tones | 3-4 metallic harmonics with slight randomization |
| `chipStack` | 3 sequential tones | Cascading ceramic clicks with reverb tail |
| `check` | Low 200Hz tone | Double-tap "knock" sound (two short filtered noise bursts) |
| `raise` | Ascending 3-note | Confident ascending chord + subtle chip slide |
| `allIn` | Low rumble | Dramatic sub-bass drop + rising tension sweep + impact |
| `win` | C-E-G chord | Full victory fanfare: arpeggio + shimmer sweep + sustained chord |
| `yourTurn` | Single 880Hz | Gentle 2-note "ding-dong" notification |
| `fold` | (new) | Soft "swoosh" - filtered descending noise |

---

## 7. Enhanced Visual Animations

### New/Upgraded Animations in `src/index.css`

1. **Card Reveal at Showdown**: New `card-showdown-reveal` - 3D flip from card back to face with a gold flash on completion.

2. **Winning Hand Highlight**: New `winning-cards-glow` - Cards pulse with a gold halo and slight float upward.

3. **Chip Scatter on Win**: New `chips-scatter` - Multiple small chip sprites fly from pot toward the winner's seat position.

4. **Player Elimination**: Improved `fold-away` - Avatar grayscales and shrinks with a subtle smoke/fade particle effect.

5. **Active Player Spotlight**: New `spotlight-pulse` - Subtle radial light behind the active player's seat.

6. **All-In Shockwave**: Improved flash - Expanding ring wave from the player who went all-in.

7. **Card Deal Arc**: Improved `card-deal-from-deck` - Cards fly in an arc from the dealer position rather than straight down.

8. **Pot Growth Animation**: Enhanced `counter-pulse` - Numbers scale up with a gold flash on each pot increase.

---

## 8. Winner Overlay Enhancement

### Changes to `src/components/poker/WinnerOverlay.tsx`
- The inline hand-complete banner gets gold confetti particles that drift down.
- Winning player's cards appear prominently in the banner alongside the hand name.
- Chip count animation is accompanied by a "cha-ching" sound.

---

## Summary of Files to Modify

| File | Changes |
|------|---------|
| `src/components/poker/PlayerSeat.tsx` | Complete redesign: avatar-centric with nameplate, hide opponent cards until showdown, showdown card reveal overlay |
| `src/components/poker/PlayerAvatar.tsx` | Larger sizes, thicker rings, improved styling |
| `src/components/poker/CardDisplay.tsx` | Add `xl` size for community cards |
| `src/components/poker/PokerTablePro.tsx` | Bigger table (88vw), adjusted card/pot positioning, use `xl` community cards, pass showdown context |
| `src/lib/poker/ui/seatLayout.ts` | Adjusted seat coordinates for larger table |
| `src/hooks/usePokerSounds.ts` | Richer multi-layered synthesized sounds for all events, add 'fold' sound |
| `src/index.css` | New animations: showdown card reveal, winning glow, chip scatter, spotlight, shockwave, improved existing animations |
| `src/components/poker/WinnerOverlay.tsx` | Enhanced confetti, winning cards display in banner |

