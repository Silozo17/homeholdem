

# Fix Seat Positions, Layout Direction, and Profile Avatars

## 3 Changes Required

### 1. Fine-tune seat coordinates in `seatLayout.ts`

Based on the screenshot, the avatar circle center (anchor) needs to sit exactly on the brown table rail edge. Current vs target:

| Seat | Current | Target | Direction |
|------|---------|--------|-----------|
| Y | (50, 83) | (50, 86) | Down ~3% |
| A | (20, 68) | (24, 70) | Right 4%, down 2% |
| E | (80, 68) | (76, 70) | Left 4%, down 2% |
| F | (88, 47) | (84, 50) | Left 4%, down 3% |
| B | (12, 47) | (16, 50) | Right 4%, down 3% (mirror of F) |
| C | (17, 22) | (20, 22) | Right 3% (keep y) |
| G | (83, 22) | (80, 22) | Left 3% (mirror of C) |
| D | (30, 5) | (33, 8) | Right 3%, down 3% |
| H | (70, 5) | (67, 8) | Left 3%, down 3% (mirror of D) |

Portrait positions adjusted proportionally.

### 2. Flip card/name/chip layout for top-half players in `PlayerSeat.tsx`

Add a `tableHalf` prop (`'top' | 'bottom'`) to `PlayerSeat`:
- **Bottom half** (Y, A, E): Current order -- Avatar on top, then cards, name, chips below
- **Top half** (B, C, D, F, G, H): Reversed -- chips, name, cards above, then Avatar at bottom

This is done by conditionally using `flex-col-reverse` when `tableHalf === 'top'`.

### 3. Show user's profile avatar for the human player in `PlayerAvatar.tsx`

- Add an optional `avatarUrl` prop to `PlayerAvatar`
- When provided, render an `<img>` inside the circle instead of the letter initial
- In `PokerTablePro.tsx`, fetch the current user's profile avatar from the database and pass it to the human player's `PlayerSeat`

---

## Technical Details

**Files to modify:**

1. **`src/lib/poker/ui/seatLayout.ts`** -- Update `SEATS_LANDSCAPE` and `SEATS_PORTRAIT` coordinate maps with the corrected values above.

2. **`src/components/poker/PlayerSeat.tsx`** -- Add `tableHalf: 'top' | 'bottom'` prop. Wrap content in `flex-col` or `flex-col-reverse` based on half. Move the avatar render block so it appears last (at bottom) for top-half players.

3. **`src/components/poker/PlayerAvatar.tsx`** -- Add optional `avatarUrl?: string` prop. When present, show `<img>` with `object-cover rounded-full` instead of the letter initial.

4. **`src/components/poker/PokerTablePro.tsx`** -- 
   - Fetch user's avatar_url from the `profiles` table using their auth ID
   - Determine `tableHalf` per seat (seats D, C, B, H, G, F = top; Y, A, E = bottom) based on yPct threshold (e.g., < 55% = top)
   - Pass `avatarUrl` and `tableHalf` through to `PlayerSeat`

