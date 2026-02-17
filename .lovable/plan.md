
# Fix Card Dealing Flow and Winner Announcement Timing

## Problems Identified

### Problem 1: Card dealing is not sequential clockwise
The current deal animation (lines 917-937 of `OnlinePokerTable.tsx`) fires visual card sprites from the dealer to each seat, but the actual hole cards (`myCards`) arrive from `poker-my-cards` API immediately when the hand_id changes (line 355 of `useOnlinePokerTable.ts`). This means the player's cards appear in `PlayerSeat` before the deal animation finishes flying to their seat, creating a jarring overlap.

The deal delay formula is `(cardIdx * activeSeatCount + seatOrder) * 0.35s`, meaning for 4 players the second card to the last player arrives at `(1 * 4 + 3) * 0.35 = 2.45s`. But the hole cards are fetched and displayed instantly.

**Fix**: Gate the display of hero cards behind a `dealComplete` flag. Only show hole cards after the dealing animation finishes. Card 1 reveals when its deal sprite lands, card 2 reveals when its sprite lands -- matching the clockwise dealing motion.

### Problem 2: Winner announced before community cards finish dealing
During all-in runouts, the server sends ALL 5 community cards at once plus the `hand_result` broadcast simultaneously. The client's staged runout (lines 460-486) correctly reveals them over 3 seconds (flop immediately, turn at 1.5s, river at 3s), BUT:
- `handWinners` is set immediately when `hand_result` arrives (line 264)
- `WinnerOverlay` renders immediately when `handWinners.length > 0` (line 889)
- Voice announcement fires immediately (line 335)

So the winner is shown while the turn/river cards are still being staged.

**Fix**: Delay setting `handWinners` during all-in runouts until the staged card reveal completes. The river card appears at 3s, so delay winner display by ~3.5s after a runout is detected.

---

## Changes

### File 1: `src/components/poker/OnlinePokerTable.tsx`

**A. Gate hero card visibility behind deal animation timing**

Add a `dealPhaseComplete` state that starts `false` when a new hand begins and becomes `true` after the full dealing animation duration. Calculate the total deal time from `activeSeats.length`:

```
totalDealTime = (1 * activeCount + (activeCount - 1)) * 0.35 + 0.7  // last card's deal sprite + card-arrive
```

In the `PlayerSeat` rendering (line 992), pass the cards as `null` while `dealPhaseComplete` is false (for the hero only -- opponents always see face-down backs anyway).

**B. Sequential card reveal per card**

The `PlayerSeat` component already has sequential reveal logic (lines 82-100) using `seatDealOrder` and `totalActivePlayers`. This is correct but the hero's `myCards` data arrives too early. The fix is to delay setting `myCards` into the player's display until each card's deal sprite would have landed.

Approach: Instead of gating all cards, use the existing `revealedIndices` mechanism in `PlayerSeat.tsx` which already calculates per-card reveal timing. The issue is that `myCards` is set immediately from the API call. Add a short delay before setting myCards to align with the deal animation start.

**C. Delay winner display during all-in runouts**

In the `hand_result` handler (line 250 of `useOnlinePokerTable.ts`), detect if this is a runout scenario (community cards jumped from less than 5 to 5 in one broadcast). If so, delay setting `handWinners` by 3.5 seconds so the staged reveal completes first.

**D. Delay winner voice announcement and overlay for runouts**

The `WinnerOverlay` (line 889) and voice announcement (line 335) both trigger off `handWinners`. Since we delay `handWinners` in the runout case, these will automatically be delayed too.

### File 2: `src/hooks/useOnlinePokerTable.ts`

**A. Delay `handWinners` during runouts**

In the `hand_result` handler (line 250), check the current community card count vs the incoming count. If it is a runout (cards jumped to 5), use a setTimeout to delay `setHandWinners`:

```text
const isRunout = prevCommunityCount < 5 && incomingCommunityCount === 5 && prevCommunityCount < 3;
const winnerDelay = isRunout ? 4000 : 0;  // Wait for staged card reveal
setTimeout(() => setHandWinners(winners), winnerDelay);
```

**B. Delay `myCards` to sync with deal animation**

After fetching hole cards (line 357), add a short delay (~800ms) before calling `setMyCards` to let the deal animation sprites start flying first. This gives the visual impression that cards arrive face-down and then flip when they land.

### File 3: `src/components/poker/PlayerSeat.tsx`

Minor adjustment to the reveal timing formula to better sync with the deal animation sprites:

Currently: `const dealDelay = (i * totalActivePlayers + seatDealOrder) * 0.18 + 0.1`
Updated: `const dealDelay = (i * totalActivePlayers + seatDealOrder) * 0.35 + 0.1`

This matches the 0.35s interval used by the deal sprites in `OnlinePokerTable.tsx` (line 928), so cards flip face-up precisely when the deal sprite lands at the seat.

---

## Detailed Sequence After Fix

```text
1. Creator hits "Deal Hand"
2. Server broadcasts game_state with phase=preflop
3. Client starts deal animation sprites (0.35s stagger, clockwise)
4. Client fetches myCards but delays display by 800ms
5. Card 1 sprite flies to Seat A (0s), card 1 sprite to Seat B (0.35s), etc.
6. Card 2 sprite flies to Seat A (1.4s for 4 players), etc.
7. As each sprite lands, the card at that seat flips from back to face (hero only sees own)
8. Full deal complete. Players see their 2 cards. Betting begins.

ALL-IN RUNOUT:
1. Player calls all-in. Server detects runout, deals all 5 community cards at once.
2. Client receives game_state with 5 community cards + hand_result broadcast
3. Staged reveal: Flop (3 cards) appear immediately, Turn at 1.5s, River at 3s
4. hand_result processing is DELAYED by 4s
5. After river is visible (3s), winner overlay + voice announcement fire at 4s
6. Showdown timer starts from winner display (5s standard / 8.5s for runouts)
```

---

## File Summary

| File | Change |
|------|--------|
| `src/hooks/useOnlinePokerTable.ts` | Delay `handWinners` by 4s during runouts; delay `myCards` by 800ms to sync with deal sprites |
| `src/components/poker/OnlinePokerTable.tsx` | No structural changes needed -- delays propagate from hook |
| `src/components/poker/PlayerSeat.tsx` | Update card reveal timing from 0.18s to 0.35s interval to match deal sprite stagger |
