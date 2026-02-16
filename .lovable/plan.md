
# Poker Table Visual & Gameplay Fixes

## 1. Game Over Screen for Bot Game (Human Loses)

**Problem**: When the human player runs out of chips, the game transitions to `game_over` phase, but `PlayPoker.tsx` (line 18) immediately returns to the lobby (`PlayPokerLobby`) when phase is `game_over`. The `WinnerOverlay` game-over screen never gets a chance to display.

**Fix**:
- **`src/pages/PlayPoker.tsx`**: Remove `game_over` from the lobby condition. Keep the table rendered during `game_over` so the `WinnerOverlay` full-screen overlay displays with stats.
- **`src/components/poker/WinnerOverlay.tsx`**: The "Play Again" button currently calls `onQuit` (line 223) -- this is a bug. Change it to call `onNextHand` (which resets the game). Also rename it properly. Ensure the game-over overlay shows whether the human won or lost, with appropriate messaging ("You Won!" vs "Game Over -- You Busted").

## 2. Back Button Exit Warning

**Problem**: The back button (line 231 in PokerTablePro) calls `setShowQuitConfirm(true)` which should open the AlertDialog. The dialog exists at the bottom of the file (line 480). This should work -- but let me verify the dialog implementation is correct. The issue may be that the `AlertDialogContent` needs to render inside the `fixed inset-0 z-[60]` container to appear above it. Currently the AlertDialog uses a portal which should work, but the z-index may conflict.

**Fix**:
- Ensure the `AlertDialog` in `PokerTablePro.tsx` renders properly by verifying z-index. The dialog portal defaults to z-50 but our game is z-[60]. Add a className to `AlertDialogContent` with `z-[70]` to ensure it appears above the game.
- Also intercept the browser back button / hardware back button using `popstate` event to show the confirmation dialog instead of navigating away.

## 3. Double the Profile Pic Sizes

**Current sizes**: `lg` = `w-14 h-14`, `sm` = `w-9 h-9`

**New sizes** (doubled):
- **`src/components/poker/PlayerAvatar.tsx`**: Add `xl` size: `w-20 h-20 text-lg` and `2xl` size: `w-24 h-24 text-xl`. Update `lg` to `w-20 h-20` (was w-14). This effectively doubles the avatar.
- **`src/components/poker/PlayerSeat.tsx`**: Use `xl` instead of `lg` for non-compact mode.
- **Online poker `OnlineSeatDisplay`**: Increase from `sm` to `lg` size.

## 4. Human Player Cards Below Profile Pic

**Current**: Cards overlay the avatar area at `-bottom-1` for human.
**New**: For human player, cards render BELOW the nameplate bar, not overlaying the avatar.

**Changes**:
- **`src/components/poker/PlayerSeat.tsx`**: Move the human player's cards rendering from inside the avatar container to below the nameplate bar. Cards display as a small fan beneath the name/chips info.
- **Online poker `OnlinePokerTable.tsx`**: The "My seat at bottom" section already shows cards beside the avatar. Keep this layout but ensure it matches the new design (cards below avatar instead of beside it).

## 5. Dealer Top-Centered

**Current**: Dealer character sits in the header bar alongside hand number and blinds info.
**New**: Move dealer to an absolute position at top-center of the table area.

**Changes**:
- **`src/components/poker/PokerTablePro.tsx`**: Remove `DealerCharacter` from the header bar. Add it as an absolutely positioned element inside the table wrapper at `top: 2%, left: 50%` (top center, above the table rail).
- **Online poker**: Dealer is already at `top: 12%` center. Adjust to `top: 2%` to match.

## 6. Seat Arrangement on Table Edge

Adjust seat coordinates so all player avatars sit precisely on the table's brown rail edge. With larger avatars, positions need slight adjustments.

**Changes**:
- **`src/lib/poker/ui/seatLayout.ts`**: Fine-tune landscape positions. The hero (Y) moves to `yPct: 92` (was 94). Top seats (D, H) move to `yPct: 8` (was 6). Left/right sides adjust inward slightly to account for larger avatars.
- **Online poker `SEAT_POSITIONS`**: Adjust coordinates to match the same rail-edge alignment.

## 7. Use Uploaded Table Image for All Games

Replace the current `table_premium.png` with the user-uploaded table image. This will automatically apply to all game modes since `TableFelt.tsx` imports from `src/assets/poker/table/table_premium.png`.

**Changes**:
- Copy `user-uploads://poker_table.png` to `src/assets/poker/table/table_premium.png` (overwrite). Since `TableFelt.tsx` already imports this path, all game modes (bot, online, tournament) will use the new image automatically.

## Files to Modify

| File | Changes |
|------|---------|
| `src/pages/PlayPoker.tsx` | Keep table rendered during `game_over` phase |
| `src/components/poker/WinnerOverlay.tsx` | Fix "Play Again" button action, add win/lose messaging |
| `src/components/poker/PokerTablePro.tsx` | Move dealer to top-center of table, fix AlertDialog z-index, add browser back button interception |
| `src/components/poker/PlayerAvatar.tsx` | Add `xl`/`2xl` sizes, increase `lg` to w-20 |
| `src/components/poker/PlayerSeat.tsx` | Use larger avatar sizes, move human cards below nameplate |
| `src/components/poker/OnlinePokerTable.tsx` | Increase seat avatar sizes, move dealer position, adjust seat coordinates, update card layout |
| `src/lib/poker/ui/seatLayout.ts` | Adjust seat coordinates for larger avatars |
| `src/assets/poker/table/table_premium.png` | Replace with uploaded table image |
