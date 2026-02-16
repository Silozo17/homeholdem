

## Two Changes

### 1. Move "5 SEC LEFT" pill under the pot total

Currently, both the "YOUR TURN" and "5 SEC LEFT" pills are positioned above the hero's cards at the bottom of the screen. The user wants only "5 SEC LEFT" moved to sit directly below the pot display (which is at `top: 20%`), while "YOUR TURN" stays exactly where it is.

**File**: `src/components/poker/OnlinePokerTable.tsx`

Change the "5 SEC LEFT" pill positioning from `bottom`-based to `top`-based, placing it just below the pot pill (approximately `top: 28%`):
```
// FROM:
bottom: isLandscape ? 'calc(22% + 65px)' : 'calc(26% + 65px)',

// TO:
top: '28%',
```

### 2. Make card animations feel real

Two issues:

**A) Player hole cards appear instantly as face-down cards, then flip.**
Currently the face-down `CardDisplay` renders immediately with a generic `card-deal-from-deck` animation (slides down from above). This doesn't sync with the flying card sprites from the dealer -- the cards are already visible at the seat before the flying sprite even arrives.

**Fix**: Add a visibility delay to PlayerSeat's card rendering. Cards should be `opacity: 0` until their deal sprite has arrived (dealDelay + flight duration), then appear with a subtle pop. This is done by wrapping each card in a container that delays its appearance:
- For human cards: already has `revealedIndices` timing, but the face-down card appears immediately. Add an initial opacity delay matching `dealDelay + 0.7s` (flight duration).
- For opponent cards during play (not showdown): they don't render cards at all, which is correct. No change needed.

In `CardDisplay.tsx`, for face-down cards, change the animation to include a delayed appearance that matches when the flying sprite arrives:
```css
/* Change animate-card-deal-deck to include initial hidden state */
@keyframes card-deal-from-deck {
  0% { opacity: 0; transform: scale(0.3); }
  85% { opacity: 0; transform: scale(0.3); }
  100% { opacity: 1; transform: scale(1); }
}
```
No -- this would break all timing. Better approach: use the existing `dealDelay` prop. The face-down card already has `animationDelay: dealDelay`. The issue is that `card-deal-from-deck` starts with `opacity: 0` but transitions to visible at 40% of the 0.5s duration (0.2s) -- far before the fly sprite arrives at `dealDelay + 0.7s`. Fix: make the face-down card use a simpler "pop in" animation with `animation-fill-mode: both` and delay it properly so it appears exactly when the fly sprite arrives.

Update `CardDisplay` face-down card: replace `animate-card-deal-deck` with a new class `animate-card-arrive` that's a quick scale-pop, and set `animationDelay` to `dealDelay + 0.7` (matching fly duration):

```css
@keyframes card-arrive {
  0% { opacity: 0; transform: scale(0.5); }
  100% { opacity: 1; transform: scale(1); }
}
.animate-card-arrive { animation: card-arrive 0.2s ease-out both; }
```

In `CardDisplay.tsx` face-down branch, change class from `animate-card-deal-deck` to `animate-card-arrive`, and set `animationDelay` to `${dealDelay + 0.7}s` so the card pops in exactly when the flying sprite reaches the seat.

**B) Community cards have no dealing animation from the dealer.**
Currently community cards just pop in place with `card-reveal`. There's no flying card from the dealer like hole cards have.

**Fix**: Add dealing sprites for community cards, similar to hole cards. In `OnlinePokerTable.tsx`, when community cards are rendered, also render fly sprites from the dealer position (top: 2%, left: 50%) to the community card area (top: 48%, left: centered). These sprites fly when a new phase starts (flop/turn/river).

Add a community card dealing animation section that detects phase changes and shows card-back sprites flying from dealer to center:
- Track `prevPhaseRef` to detect flop/turn/river transitions
- On flop: 3 sprites fly to center with staggered delays
- On turn: 1 sprite flies to center
- On river: 1 sprite flies to center
- Each sprite uses a new `deal-card-fly-center` keyframe that flies to center-table coordinates

```css
@keyframes deal-card-fly-center {
  0% { transform: translate(0, 0) scale(0.4); opacity: 0.8; }
  40% { opacity: 1; }
  100% { transform: translate(0, var(--deal-center-dy)) scale(1); opacity: 0.9; }
}
```

---

### Files to Modify

| File | Change |
|------|--------|
| `src/components/poker/OnlinePokerTable.tsx` | Move "5 SEC LEFT" to `top: 28%`; add community card deal sprites on phase change |
| `src/components/poker/CardDisplay.tsx` | Replace `animate-card-deal-deck` with `animate-card-arrive` and sync delay to `dealDelay + 0.7` |
| `src/index.css` | Add `card-arrive` keyframe; add `deal-card-fly-center` keyframe |

### What Does NOT Change
- "YOUR TURN" pill position (stays exactly where it is)
- Seat positions, layout, logic
- Showdown animations, chip animations, winner overlay
- No backend/edge function changes
