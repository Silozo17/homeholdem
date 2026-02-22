

## Three Surgical Fixes — Voice Timing, Card Clearing, and Winner Announcement

### Fix 1 — Move `announceGameOver` inside timer (two locations)

**File:** `src/components/poker/OnlinePokerTable.tsx`

**Line 750:** The fallback loser path calls `announceGameOver` immediately, outside the 2000ms `setTimeout`. Move it inside the timer, just before `setGameOver(true)`.

**Line 777:** The opponent-left winner path also calls `announceGameOver('You', true)` immediately outside its 4000ms timer. Move it inside the timer the same way.

Both paths will then announce game over at the same moment the game over screen appears.

---

### Fix 2 — Move card clearing inside the `gameOverPendingRef` guard

**File:** `src/hooks/useOnlinePokerTable.ts`

**Lines 455-456:** `setMyCards(null)` and `setRevealedCards([])` are outside the `if (!gameOverPendingRef.current)` guard, so they fire unconditionally at the 12s mark even during a game-over sequence. Move both lines inside the guard block (after line 453).

Then in `OnlinePokerTable.tsx`, the gameOver effect (line 855-867) already calls `leaveSeat()` which triggers cleanup. No additional changes needed there -- cards persist until game over, then the Play Again handler (line 1674) clears `visibleCommunityCards`.

---

### Fix 3 — Prevent winner voice timer from being cancelled

**File:** `src/components/poker/OnlinePokerTable.tsx`

**Lines 559-579:** The current `useEffect` returns `() => clearTimeout(timer)` as cleanup and depends on `[handWinners, user, announceCustom]`. If any of those references change within 400ms, React re-runs the effect, the cleanup cancels the timer, and voice never fires.

Changes:
- Snapshot `handWinners` into a local const before the timer
- Remove the `return () => clearTimeout(timer)` cleanup entirely
- Change dependencies to `[handWinners.length > 0, user?.id]` so the effect only fires once when winners first appear

---

### Files Changed
- `src/components/poker/OnlinePokerTable.tsx` (Fixes 1 and 3)
- `src/hooks/useOnlinePokerTable.ts` (Fix 2)

### Verification
1. All-in loss: `announceGameOver` voice fires 2s after bust, synced with game over screen
2. Opponent leaves: `announceGameOver` voice fires 4s later with game over screen
3. Preflop all-in: community cards and hole cards stay visible through winner overlay and game over screen
4. Both winner and loser hear winner voice announcement ~400ms after overlay appears

