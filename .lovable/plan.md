
# Multiplayer Poker: 7 Fixes

## 1. Allow mid-game joining

**Current**: `canJoin={!isSeated && !hand}` (line 717) blocks joining when a hand is in progress.
**Fix**: Change to `canJoin={!isSeated}`. The server already allows it (no hand-active check in `poker-join-table`). New players simply sit out until the next hand. The `poker-start-hand` edge function only deals to players who were seated before the hand began, so this is safe.

**File**: `src/components/poker/OnlinePokerTable.tsx` (line 717)

---

## 2. Longer winner banner display

**Current**: The showdown timer clears winners after 5 seconds (line 243 in `useOnlinePokerTable.ts`).
**Fix**: Increase from `5000` to `7000` ms so the winner overlay displays for 7 seconds.

**File**: `src/hooks/useOnlinePokerTable.ts` (line 253 timeout)

---

## 3. Emoji display duration to 6 seconds

**Current**: Chat bubbles disappear after 5 seconds (lines 262 and 416).
**Fix**: Change both timeouts from `5000` to `6000`.

**File**: `src/hooks/useOnlinePokerTable.ts` (lines 262, 416)

---

## 4. Deal button only at the very beginning

**Current**: The Deal button shows whenever `!hand && !autoStartAttempted` which includes between hands.
**Fix**: Add a `handHasEverStarted` ref that is set to `true` once the first hand begins and never resets. The Deal button condition becomes: `isCreator && !hand && !autoStartAttempted && !handHasEverStarted && activeSeats.length >= 2`.

**Files**: `src/hooks/useOnlinePokerTable.ts` (add `handHasEverStarted` state, set true when first hand starts, export it), `src/components/poker/OnlinePokerTable.tsx` (add to condition)

---

## 5. Fix deal card animation order and speed

**Current issues**:
- Animation uses `(cardIdx * activeSeatCount + screenPos) * 0.243` which doesn't produce a realistic round-robin deal (should deal one card to each player in order, then second card to each).
- The card opacity ends at 0 in the keyframe (`opacity: 0` at 100%), making the flying card invisible on arrival.
- Animation is too fast (0.54s flight, 0.243s gap).

**Fix**:
- Change delay formula to real round-robin: `const seatOrder = activeScreenPositions.indexOf(screenPos); const delay = (cardIdx * activeSeatCount + seatOrder) * 0.35;` -- only count active seats in order.
- Slow flight duration from `0.54s` to `0.7s`.
- Increase the dealing state duration from `3000` to `4500` ms to accommodate slower animation.
- Fix the CSS keyframe in `src/index.css` so the card doesn't vanish: change final opacity from `0` to `1` (or `0.9`), and keep scale at 1.

**Files**: `src/components/poker/OnlinePokerTable.tsx` (lines 639-666, line 218), `src/index.css` (deal-card-fly keyframe)

---

## 6. Make chip-to-winner animation visible

**Current issues**:
- ChipAnimation ends at `opacity: 0.6` and `scale(0.7)` -- chips shrink and fade as they travel, becoming nearly invisible.
- Only 4 chips spawn and they last 600ms with the cleanup timer at 800ms.
- The chip itself is only `w-3 h-3` (12px).

**Fix**:
- Update `chip-fly-custom` keyframe in `src/index.css`: change end state to `opacity: 1` and `scale(1.2)` so chips grow and stay visible.
- Increase chip count from 4 to 6.
- Increase chip size in `ChipAnimation.tsx` from `w-3 h-3` to `w-4 h-4`.
- Increase animation duration from 600ms to 900ms and cleanup from 800ms to 1200ms.
- Add a gold glow/shadow to make chips pop against the green felt.

**Files**: `src/index.css`, `src/components/poker/ChipAnimation.tsx`, `src/components/poker/OnlinePokerTable.tsx` (chip animation spawn, lines 240-247)

---

## 7. All-in auto-deal to the end

**Current**: The server already handles this correctly (lines 422-429 in `poker-action/index.ts`): when all active players are all-in, it runs out all community cards at once and goes to showdown. This is working server-side.

**Verify client-side**: The client receives the `game_state` broadcast with all 5 community cards and phase `showdown`, then the `hand_result` broadcast. No client changes needed -- this already works. However, if there's a visual issue where the community cards appear all at once without drama, we can add a staggered reveal animation.

**Fix (optional polish)**: No code changes needed for correctness. The server already auto-deals when everyone is all-in. If the user reports it's not working, it may be a separate issue with the action flow.

---

## Summary

| # | Fix | Files |
|---|-----|-------|
| 1 | Mid-game joining | `OnlinePokerTable.tsx` |
| 2 | Winner banner 5s to 7s | `useOnlinePokerTable.ts` |
| 3 | Emoji 5s to 6s | `useOnlinePokerTable.ts` |
| 4 | Deal button first hand only | `useOnlinePokerTable.ts`, `OnlinePokerTable.tsx` |
| 5 | Deal animation order + speed | `OnlinePokerTable.tsx`, `index.css` |
| 6 | Visible chip animations | `index.css`, `ChipAnimation.tsx`, `OnlinePokerTable.tsx` |
| 7 | All-in auto-deal | Already working server-side, no changes needed |
