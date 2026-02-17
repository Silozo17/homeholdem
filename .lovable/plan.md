

# Fix: Timeout, Disconnect Detection, and Inactivity Kick

## Problem Summary

1. **Pre-flop timeout does nothing**: When a player's timer expires during pre-flop, the fold only works if the player's client is active. If their app is backgrounded or disconnected, no one triggers the timeout.
2. **No disconnect indicator**: Other players have no idea when someone has disconnected.
3. **No inactivity kick**: Players can go AFK indefinitely without being removed.

---

## Root Cause Analysis

- **Client-side timeout ping** (line 406-421 in `useOnlinePokerTable.ts`) only fires for **other players** (`!isMyTurn`). It correctly pings the server 2s after the deadline to force-fold the stuck player.
- **Local fold via `onTimeout`** on `PlayerSeat` fires for the hero when it is their turn -- but ONLY if the app is in the foreground. Backgrounded apps pause JS timers.
- **Server-side `poker-check-timeouts`** exists and correctly auto-folds hands past deadline + 10s, but it is a passive edge function that nobody calls periodically.
- **Presence tracking** already exists (players `track()` on the channel), but no "disconnected" state is shown to other users.
- **No idle/inactivity detection** exists anywhere.

---

## Fix 1: Robust Timeout Enforcement (Client Polling)

Every seated client will periodically call `poker-check-timeouts` as a fallback, ensuring stuck hands are always resolved even if the stuck player's device is off.

**File: `src/hooks/useOnlinePokerTable.ts`**
- Add a `setInterval` (every 8 seconds) that checks if there's an active hand with an expired `action_deadline`
- If deadline is more than 3 seconds past, call `poker-check-timeouts` via `callEdge`
- Only the auto-start leader does this to avoid all clients hammering the endpoint
- On success, call `refreshState()` to pick up the new game state

---

## Fix 2: Disconnect Indicator on Player Avatars

Use Supabase Presence to detect when a player leaves the channel (disconnect/close app). Show a red "wifi off" icon overlay on their avatar.

**File: `src/hooks/useOnlinePokerTable.ts`**
- Track `onlinePlayerIds: Set<string>` from presence state
- On `presence.sync`, collect all player_ids that are present
- Expose `onlinePlayerIds` from the hook

**File: `src/components/poker/OnlinePokerTable.tsx`**
- Pass `isDisconnected` prop to `PlayerSeat` when a seated player is NOT in `onlinePlayerIds`

**File: `src/components/poker/PlayerSeat.tsx`**
- Accept `isDisconnected?: boolean` prop
- When true, render a small red `WifiOff` icon overlay on the avatar with a pulsing red border

---

## Fix 3: Inactivity Kick (2-Minute No-Touch Auto-Leave)

Detect when the user hasn't touched the screen for 2 minutes and auto-leave the table.

**File: `src/components/poker/OnlinePokerTable.tsx`**
- Add touch/click/keydown listeners that reset an inactivity timer
- After 120 seconds (2 minutes) of no interaction, show a 10-second warning toast ("You will be removed for inactivity")
- If still no interaction after the warning, call `leaveTable()` and `onLeave()`
- Reset timer on any user interaction

---

## Fix 4: Ensure Local Timeout Still Works When Foregrounded

The existing `onTimeout` callback on `PlayerSeat` already handles local fold when it is the hero's turn and timer expires. This is fine for foreground usage. The server-side polling (Fix 1) handles the backgrounded case.

No changes needed here -- just confirming the existing logic is sound.

---

## Technical Summary

| File | Change |
|------|--------|
| `src/hooks/useOnlinePokerTable.ts` | Add periodic `poker-check-timeouts` polling (8s interval, leader-only); track `onlinePlayerIds` from presence; expose both |
| `src/components/poker/OnlinePokerTable.tsx` | Pass `isDisconnected` to PlayerSeat; add 2-min inactivity detection with warning + auto-leave |
| `src/components/poker/PlayerSeat.tsx` | Accept and render `isDisconnected` prop (red WifiOff icon overlay on avatar) |

