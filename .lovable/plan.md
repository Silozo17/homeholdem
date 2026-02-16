

## Fix 4 Issues: YOUR TURN Position, Game Freeze, Header Layout, Card Dealing Animation

### 1. YOUR TURN Badge Position (OnlinePokerTable)

**Problem**: The "YOUR TURN" badge is positioned at `bottom: calc(50% + 60px)` which places it near the center of the screen (by the pot/dealer area), instead of above the hero's cards at the bottom.

**Fix**: Change the positioning to place it just above the hero's cards. In landscape, the hero sits at ~92% yPct, so the badge should be near the bottom of the viewport, above the betting controls but near the player's cards. Use `bottom: 18%` (landscape) / `bottom: 22%` (portrait) so it sits above the hero's card fan.

**File**: `src/components/poker/OnlinePokerTable.tsx` (lines 800-804)
- Also adjust the "5 SEC LEFT" pill similarly (lines 821-825)

---

### 2. Game Freeze After 2-3 Hands (useOnlinePokerTable)

**Problem**: The auto-deal system has a known race condition. After a hand completes, the `showdownTimerRef` clears the hand after 3.5s and resets `autoStartAttempted`. But the fallback reset at line ~470 (1.5s timeout) can conflict with the showdown timer, creating a state where auto-deal never triggers.

**Root Causes**:
- The showdown timer resets `autoStartAttempted` to false, but the fallback effect (lines 453-460) also runs and can set a competing timeout.
- If `autoStartAttempted` is reset before `hasActiveHand` fully clears, the auto-start fires, fails (hand still clearing), and then `autoStartAttempted` stays true permanently.
- The `autoStartTimerRef` check (`if (autoStartTimerRef.current) return`) prevents new attempts if a previous timer reference wasn't cleaned up.

**Fix** (in `src/hooks/useOnlinePokerTable.ts`):
- Make the auto-deal effect more robust by:
  1. Always clear `autoStartTimerRef.current` in the cleanup function
  2. Add a guard: if `startHand` fails, reset both the ref and the state
  3. Increase the fallback reset delay from 1.5s to 4.5s (after showdown 3.5s + buffer) to avoid conflicts
  4. Add a second safety net: if `seatedCount >= 2`, no active hand, and `autoStartAttempted` is true for more than 6 seconds, force reset

---

### 3. Move Table Name and Blinds to Left of Header (OnlinePokerTable)

**Problem**: In `OnlinePokerTable.tsx`, the table name and blinds are in the center of the header, but user wants them next to the back arrow on the left (matching `PokerTablePro` layout).

**Fix** (in `src/components/poker/OnlinePokerTable.tsx`, lines 422-443):
- Group the back arrow, table name, hand number badge, and blinds text together in a single `flex items-center gap-2` div on the left side
- Remove the center div that currently holds these elements

---

### 4. Card Dealing Animation Must Always Be Visible

**Problem**: The last edit replaced `animate-card-deal-deck` with `animate-fade-in` on face-up cards. But this means when cards are revealed sequentially (face-down then face-up), the face-up state loses the dealing fly-in. The face-down card shows the fly-in correctly, but when it transitions to face-up, it just fades in instead of staying in place.

**Fix**: The face-up card should NOT replay any translation animation. It should simply appear in-place instantly (no animation class at all, or just opacity:1). The dealing animation was already played during the face-down phase. The `animate-fade-in` adds a `translateY(10px)` which causes a slight visual jump.

**File**: `src/components/poker/CardDisplay.tsx` (line 60)
- Replace `animate-fade-in` with no animation class (just show the card immediately)
- The dealing fly-in animation (`animate-card-deal-deck`) on the face-down branch (line 33) remains as-is -- this is the visible dealing animation
- The deal animation in `OnlinePokerTable.tsx` (lines 664-698) also remains -- those are the flying card-back sprites from dealer to each seat

**File**: `src/components/poker/PlayerSeat.tsx`
- Ensure the `seatDealOrder` and `totalActivePlayers` props are passed correctly in `OnlinePokerTable.tsx` for multiplayer (currently they are NOT passed, defaulting to 0 and 1). This means online cards skip the sequential reveal timing.

**File**: `src/components/poker/OnlinePokerTable.tsx` (lines 780-791)
- Pass `seatDealOrder` and `totalActivePlayers` to `PlayerSeat` in the multiplayer table, calculated from the active seat positions, so the round-robin dealing timing matches the flying card sprites.

---

### Summary of Files to Modify

| File | Changes |
|------|---------|
| `src/components/poker/OnlinePokerTable.tsx` | Move header items left; fix YOUR TURN/5SEC position; pass dealing props to PlayerSeat |
| `src/hooks/useOnlinePokerTable.ts` | Harden auto-deal to prevent game freeze |
| `src/components/poker/CardDisplay.tsx` | Remove `animate-fade-in` from face-up cards (no animation needed) |

