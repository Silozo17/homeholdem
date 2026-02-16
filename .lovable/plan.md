

# Multiplayer Poker: 8 Improvements

This plan covers all 8 items, grouped into what can be done together efficiently. Some items (like emoji chat and dealing animation) are larger features; others are quick CSS/positioning fixes.

---

## 1. Game Over Screen When Player Busts Out

Currently, when the human player loses all chips, nothing happens -- the game just continues without them. We need to detect when the player's stack hits 0 and show the `WinnerOverlay` in `isGameOver={true}` mode.

### Changes:
**`src/components/poker/OnlinePokerTable.tsx`**
- Add a `useEffect` that watches `mySeat.stack`. When it reaches 0 after a hand completes (and `handWinners` is populated), set a `gameOver` state to `true`.
- Render `WinnerOverlay` with `isGameOver={true}`, showing the winner of the final hand and a "Close Game" button that calls `leaveTable()` + `onLeave()`.

---

## 2. Confetti Celebration for Winner

When `handWinners` is populated and the winner is the human player (`player_id === user.id`), render a confetti burst overlay using the existing `animate-confetti-drift` keyframes.

### Changes:
**`src/components/poker/OnlinePokerTable.tsx`**
- Inside the `handWinners.length > 0` block, check if the human won. If so, render 20-30 small colored squares with `animate-confetti-drift` and randomized positions/delays.

---

## 3. Chip Animation: Pot Flies to Winner

Use the existing `ChipAnimation` component. When `handWinners` is set, spawn 3-5 chip animations from the pot position (50%, 20%) to the winning player's seat position.

### Changes:
**`src/components/poker/OnlinePokerTable.tsx`**
- Import `ChipAnimation`.
- When `handWinners` appears, determine the winner's screen seat position from `rotatedSeats` and `positions`.
- Render 3-5 `ChipAnimation` instances with staggered timing from pot center to that seat's `(xPct, yPct)`.

---

## 4. Human Player Cards: Raise by 2px

Simple one-line CSS adjustment.

### Changes:
**`src/components/poker/PlayerSeat.tsx`**
- Line 64: Change `bottom: 'calc(30% + 7px)'` to `bottom: 'calc(30% + 9px)'`

---

## 5. 15-Second Turn Timer (Red Circle Around Active Player)

The `TurnTimer` component already renders a circular SVG ring around the active player that depletes over time, changing from gold to red. Currently it uses a 30s default.

### Changes:
**`src/components/poker/PlayerSeat.tsx`**
- Line 115: Change `TurnTimer` to use `duration={15}` instead of the default 30.

**`src/components/poker/TurnTimer.tsx`**
- Change default `duration` prop from 30 to 15.
- The color already transitions gold to red. No changes needed for the visual style.

**Server side (poker-start-hand):**
- Line ~228: Change `action_deadline` from `30_000` to `15_000` ms so the server matches the client timer.

All players already see this ring because `PlayerSeat` renders `TurnTimer` for whichever seat is `isCurrentPlayer`. It's already live and synced.

---

## 6. Emoji Communication & Pre-made Messages

Add a small emoji/chat button on the table that opens a quick-select panel of emojis and preset messages. These are broadcast via the existing Supabase Realtime channel and displayed as floating bubbles near the sender's seat.

### Changes:

**`src/components/poker/QuickChat.tsx`** (new file)
- A button (speech bubble icon) that opens a small popover with:
  - Row of emoji reactions: thumbs-up, laugh, cry, angry, fire, heart, sunglasses, thinking
  - Row of preset messages: "Nice hand!", "Good luck!", "Bluff!", "Oops!", "GG", "Let's go!"
- On select, broadcasts `{ event: 'chat_emoji', payload: { player_id, emoji/message } }` on the table channel.

**`src/hooks/useOnlinePokerTable.ts`**
- Add a `chatMessages` state array and listen for `chat_emoji` broadcast events.
- Each message has `player_id`, `text`, `timestamp`. Auto-expire after 3 seconds.
- Expose `sendChatEmoji(text: string)` and `chatMessages` in the return.

**`src/components/poker/OnlinePokerTable.tsx`**
- Render `QuickChat` button in the header bar.
- For each active `chatMessage`, find the sender's screen seat position and render a floating bubble near their avatar that fades out after 3 seconds.

---

## 7. Action Badge Color Coding & Hero Badge Repositioning

### Color coding issue:
The `PlayerSeat` action badges already have color coding (lines 155-161) -- Fold is red, Raise/All-in is red, Call/Check is secondary. These should already match the bot game. If they don't appear color-coded, it may be because `lastActions` values from the server are lowercase (e.g., "call") while the CSS checks for capitalized starts (e.g., `startsWith('Call')`).

### Fix:
**`src/components/poker/OnlinePokerTable.tsx`** (or `useOnlinePokerTable.ts`)
- When storing `lastActions`, capitalize the first letter of the action string so it matches the CSS class conditions in `PlayerSeat`.

### Hero badge cut-off:
The hero's action badge renders at `-bottom-5` which goes below the screen edge. For the hero player (screen position 0, bottom-center), move the badge to the right side of the chip count instead.

### Fix:
**`src/components/poker/PlayerSeat.tsx`**
- Add an `isHero` check to the action badge. If `isHuman`, position it differently: instead of `absolute -bottom-5`, place it to the right of the nameplate bar using `absolute -right-14 top-1/2 -translate-y-1/2` or similar.

---

## 8. Card Dealing Animation

Cards should visually slide from the dealer position (top center) to each player's seat in round-robin order (one card to each player, then second card to each).

### Changes:
**`src/components/poker/OnlinePokerTable.tsx`**
- When a new hand starts (detected by `hand?.hand_id` changing and `hand?.phase === 'preflop'`), set a `dealing` state to `true` for ~2 seconds.
- During this window, render temporary card-back sprites that animate from the dealer position (50%, 2%) to each seat position using CSS keyframes.
- Use the existing deal delay formula: `(cardIndex * totalActivePlayers + seatOrder) * 0.18s`.

**`src/index.css`**
- Add a `@keyframes deal-card-fly` that moves from `translate(0,0)` to `translate(var(--deal-dx), var(--deal-dy))` with a slight rotation.

The `seatDealOrder` and `totalActivePlayers` props are already passed to `PlayerSeat` and `CardDisplay` for timing.

---

## Summary Table

| # | Feature | Files Modified | Complexity |
|---|---------|---------------|------------|
| 1 | Game Over screen | OnlinePokerTable.tsx | Low |
| 2 | Confetti for winner | OnlinePokerTable.tsx | Low |
| 3 | Chips fly to winner | OnlinePokerTable.tsx | Low |
| 4 | Cards raised 2px | PlayerSeat.tsx | Trivial |
| 5 | 15s timer | TurnTimer.tsx, PlayerSeat.tsx, poker-start-hand/index.ts | Low |
| 6 | Emoji chat | QuickChat.tsx (new), useOnlinePokerTable.ts, OnlinePokerTable.tsx | Medium |
| 7 | Badge colors & hero position | PlayerSeat.tsx, useOnlinePokerTable.ts | Low |
| 8 | Deal animation | OnlinePokerTable.tsx, index.css | Medium |

