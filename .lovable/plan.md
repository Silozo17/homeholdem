

# Poker Table Overhaul: Visibility, Alignment, Timer Enforcement, and Asset Usage

## Problems Identified

1. **Players barely visible**: Avatar size is "sm" (32x32px), text is 9px -- far too small for landscape mobile
2. **Cards too small**: Hole cards use `size="sm"` (28x40px) -- unreadable on mobile
3. **Folded players invisible**: `opacity-40` on both the seat wrapper AND internally on the avatar makes folded players nearly invisible (compounding to ~16% opacity)
4. **Asymmetric seat placement**: The landscape ellipse has `cy: 48` (off-center) and `rx: 42` which pushes side players unevenly; the 9-player angle map has gaps
5. **Turn timer is decorative only**: The `TurnTimer` component renders a visual ring but its `onTimeout` callback is never wired up -- time expires with zero consequences
6. **Premium assets unused**: `PokerChip` component, `ChipAnimation` component, `dealer-portrait.png`, and `felt-texture.jpg` exist but are not used on the table
7. **No chip animations**: When players bet/call/raise, there are no chip-fly animations to the pot

---

## Plan (4 files changed)

### 1. `src/components/poker/PlayerSeat.tsx` -- Bigger, more readable, folded players visible

- **Avatar size**: Change from `size="sm"` to `size="md"` (w-11 h-11 instead of w-8 h-8)
- **Card size**: Change hole cards from `size="sm"` to `size="md"` (w-10 h-14 instead of w-7 h-10)
- **Text sizes**: Player name from `text-[9px]` to `text-[11px]`, chips from `text-[9px]` to `text-[10px]`, action badge from `text-[8px]` to `text-[10px]`, bet text from `text-[8px]` to `text-[10px]`
- **Max width**: Name truncation from `max-w-[56px]` to `max-w-[72px]`
- **Folded visibility fix**: Change `opacity-40` to `opacity-60` so folded/eliminated players remain readable; add a "FOLDED" text overlay on folded cards
- **Action badge contrast**: Make the fold badge use a higher contrast style with a red-tinted background
- **Wire up TurnTimer onTimeout**: Accept a new `onTimeout` prop and pass it through to TurnTimer
- **Use PokerChip component**: Replace the plain colored dot for current bet indicator with the actual `PokerChip` component

### 2. `src/lib/poker/ui/seatLayout.ts` -- Symmetric, properly centered layout

- **Landscape ellipse**: Change to `{ cx: 50, cy: 50, rx: 40, ry: 36 }` -- vertically centered, slightly larger ry for better vertical spread
- **Push distance**: Increase from `2` to `5` to push seats clearly outside the rail
- **9-player landscape angles**: Redesign for symmetry:
  `[90, 130, 165, 200, 230, 50, 335, 310, 15]`
  This places seats symmetrically: bottom-center (You), then pairs on each side going up, with top-sides balanced
- **Clamp range**: Widen from `5-95` to `3-97` for edge seats

### 3. `src/components/poker/PokerTablePro.tsx` -- Timer enforcement and chip animations

- **Timer enforcement**: When it's the human player's turn, track a 30-second countdown. When `onTimeout` fires from `PlayerSeat`, auto-fold the human player by calling `onAction({ type: 'fold' })`
- **Pass `onTimeout` to PlayerSeat**: Wire up an `onTimeout` callback for the human seat that triggers auto-fold
- **Remove double opacity**: Currently the seat wrapper applies `opacity-60` for non-active players on top of PlayerSeat's own opacity -- remove the wrapper opacity logic since PlayerSeat handles it internally
- **Community card size**: Upgrade from `size="md"` to `size="lg"` for better visibility in landscape

### 4. `src/hooks/usePokerGame.ts` -- Timer-based auto-fold action

- No changes needed here -- the `PLAYER_ACTION` with `fold` dispatched from PokerTablePro handles it correctly through the existing reducer

---

## Technical Details

**Timer enforcement flow:**
The human player gets 30 seconds per action. The TurnTimer SVG ring depletes visually. When it hits zero, `onTimeout` fires, which calls `onAction({ type: 'fold' })` automatically. This mirrors real poker rules where inaction equals a fold.

**Seat symmetry math (9 players, landscape):**
```text
         Dealer (270)
    200            335
  165                 310 
 130                    50
    90 (You, bottom center)
         15 (bottom-right)
```

**Opacity fix:**
Currently: wrapper `opacity-60` x PlayerSeat `opacity-40` x Avatar `opacity-40` = effectively ~10% visible.
Fix: Single `opacity-60` on PlayerSeat only, no wrapper opacity, no avatar internal opacity for folded state.

**Assets now used:**
- `PokerChip` component replaces plain dots for bet indicators
- `ChipAnimation` can be wired for bet-to-pot fly animations (stretch goal, not blocking)

