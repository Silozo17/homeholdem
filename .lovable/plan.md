
# Fix Hand History + Rework Community Card Dealing

Two issues to fix, plus a visual upgrade to community card presentation.

## Issue 1: Hand History Does Nothing

**Root cause**: The `HandReplay` sheet renders at z-index auto inside the poker table's `z-[60]` fixed container, but the `Sheet` overlay/content gets trapped behind multiple `z-index` layers (HEADER at 40, ACTIONS at 50, etc.). Additionally, `modal={false}` was added in a previous change, which means there's no backdrop overlay to bring the sheet to the foreground, and the sheet content likely renders at a lower z-index than the game layers.

**Fix**: In `HandReplay.tsx`, add an explicit high z-index (e.g. `z-[80]`) to the `SheetContent` so it renders above all game layers (max is ACTIONS at 50). Also verify `modal` is restored to `true` (or use explicit z-index with `modal={false}`).

**File**: `src/components/poker/HandReplay.tsx`

## Issue 2: Community Card Dealing Animation Rework

### Current problems:
- **a)** Community deal sprites all fly to the same spot (center) -- they use a single `--deal-center-dy` with no horizontal offset.
- **b)** Sprites fly AFTER the actual community cards have already appeared (the real cards render immediately from state, then the sprite animation plays on top).
- **c)** Sprites abruptly disappear after 1200ms timeout with no fade.
- **d)** Sprites land lower/misaligned compared to actual card positions.

### New approach -- cards dealt by dealer ARE the actual cards:

1. **Remove the separate `communityDealSprites` system entirely** -- no more fake card-back divs flying from the dealer.

2. **Add 5 card slot outlines on the felt** -- 5 white-bordered empty rectangles at the community card area, always visible. Cards fill into their respective fixed slots (slot 0-2 for flop, slot 3 for turn, slot 4 for river).

3. **Card dealing animation on the actual CardDisplay components**:
   - When new community cards appear (flop/turn/river phase change), the actual `CardDisplay` components animate FROM the dealer position TO their slot position.
   - Cards start face-down, fly to their slot, then flip face-up with a 0.2s stagger between each card (left to right).
   - This means the `CardDisplay` itself handles the full animation: fly-in (face down) then flip (face up).

4. **Implementation details**:

   **`src/components/poker/OnlinePokerTable.tsx`**:
   - Remove `communityDealSprites` state and the `useEffect` that creates them (lines 300-313).
   - Remove the `communityDealSprites.map(...)` render block (lines 1277-1282).
   - Replace the community cards render section (lines 1159-1166) with a fixed 5-slot layout:
     - 5 card-sized containers with white/20 border outlines, always rendered.
     - Each slot either contains a `CardDisplay` (if card exists for that index) or stays empty.
     - Cards use a new `dealFromDealer` prop that triggers a CSS animation: translate from dealer (top center) to slot, face-down, then flip.

   **`src/components/poker/CardDisplay.tsx`**:
   - Add a `dealFromDealer` prop with a delay value.
   - When `dealFromDealer` is set, the card first renders face-down at the dealer position (via CSS transform), then animates to its natural position, and after arriving, plays a flip animation to reveal the face.

   **`src/index.css`**:
   - Add a new `@keyframes community-deal` animation: starts translated up (from dealer area), face-down look, ends at natural position.
   - Add a `@keyframes card-flip` animation: rotateY 0 to 180deg with a midpoint card-back to card-face swap.
   - Remove or keep `deal-card-fly-center` (no longer used).

   **`src/components/poker/PokerTablePro.tsx`** (practice mode):
   - Apply the same 5-slot layout with outlines for consistency.

### Visual result:
- 5 white-outlined card slots always visible on the felt (like a real poker table).
- On flop: 3 cards fly from dealer to slots 0, 1, 2 (face down), then flip left-to-right with 0.2s delay.
- On turn: 1 card flies to slot 3, flips.
- On river: 1 card flies to slot 4, flips.
- No phantom sprites, no abrupt disappearance, no misalignment.

## Files Changed

| File | Change |
|------|--------|
| `src/components/poker/HandReplay.tsx` | Add z-[80] to SheetContent so it renders above game layers |
| `src/components/poker/OnlinePokerTable.tsx` | Remove communityDealSprites system, add 5-slot community card layout with outlines, pass dealFromDealer timing to CardDisplay |
| `src/components/poker/CardDisplay.tsx` | Add dealFromDealer prop with fly-in + flip animation sequence |
| `src/components/poker/PokerTablePro.tsx` | Same 5-slot community card layout with outlines |
| `src/index.css` | Add community-deal-fly and card-flip keyframes, remove deal-card-fly-center |

## NOT Changed
- Edge functions, server logic, bottom navigation, layout, logo, seat positions, player card dealing, QuickChat, header buttons
