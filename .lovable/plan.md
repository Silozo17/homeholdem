# Plan: "Are You Still Playing?" Popup + Faster Inactivity Kicks

## What Changes

### New Flow After a Turn Timeout

Currently, when a player's 45-second turn expires, they are auto-folded and the game continues. There is no check to see if the player is actually still at their device.

**New behaviour:**

1. Player has **45 seconds** to act on their turn (unchanged)
2. If they time out (auto-fold), a full-screen **"Are you still playing?"** popup appears with a **30-second countdown**
3. If the player taps **"I'm Still Here"**, the popup closes and they continue playing normally
4. If the 30 seconds expire without a tap, the player is **kicked from their seat** (but remains at the table as a spectator)
5. From that moment, if the player does nothing for **90 seconds**, they are **kicked from the table entirely**

### Server-Side Threshold Reductions

The current server-side timers are too generous. They will be tightened:

- **Heartbeat stale threshold**: 90s to mark as disconnected (stays the same -- already correct)
- **Force-remove disconnected**: reduced from **3 minutes to 90 seconds** (matches the user's request)
- Only applies to kicked seat players! Does not affect spectators!

---

## Technical Details

### 1. Client-side: "Are you still playing?" popup

**File: `src/components/poker/OnlinePokerTable.tsx**`

- Add new state: `showStillPlayingPopup` (boolean) and `stillPlayingCountdown` (number, starts at 30)
- When the turn timer fires `onTimeout` and triggers an auto-fold, instead of just folding silently, also set `showStillPlayingPopup = true`
- Start a 30-second countdown interval that decrements `stillPlayingCountdown` every second
- If countdown reaches 0: call `leaveSeat()` to remove the player from their seat, close the popup
- If the player taps "I'm Still Here": close the popup, reset countdown
- Render the popup as a full-screen overlay (using AlertDialog) with a large countdown number and a "I'm Still Here" button

**File: `src/components/poker/OnlinePokerTable.tsx**` (inactivity system)

- Reduce the general inactivity timer from **2 minutes to 90 seconds** (for the "kick from table" step after being removed from seat)
- Remove the current workaround that skips the kick during an active hand (no longer needed since the popup handles in-hand timeouts)
- The warning period stays at 10 seconds

### 2. Server-side: Faster force-removal

**File: `supabase/functions/poker-check-timeouts/index.ts**`

- Section 5: Change the force-remove threshold from 180,000ms (3 minutes) to **90,000ms (90 seconds)**
- This means a disconnected player (grey avatar) will be fully removed after 90 seconds instead of 3 minutes

### 3. Track consecutive timeouts for the popup trigger

The popup should only appear after an **auto-fold timeout**, not just any fold. The `onTimeout` callback in `PlayerSeat` already fires only when the turn timer expires (not when the player manually folds). We hook into this existing callback.

---

## Summary of File Changes


| File                                               | Change                                                                                                                                  |
| -------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `src/components/poker/OnlinePokerTable.tsx`        | Add "Are you still playing?" popup state + UI, trigger on auto-fold timeout, kick from seat after 30s, reduce general inactivity to 90s |
| `supabase/functions/poker-check-timeouts/index.ts` | Reduce force-remove threshold from 3min to 90s                                                                                          |


## What Does NOT Change

- 45-second turn timer duration -- stays the same
- Server heartbeat interval (30s pings) -- stays the same  
- Heartbeat stale threshold (90s to mark disconnected) -- stays the same
- Seat positions, dealer, bottom nav -- untouched
- No layout or styling changes outside the new popup