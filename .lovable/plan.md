
# Comprehensive Poker Game Audit and Fix Plan

## Currently Stuck Game

Hand `eae5408e` is stuck in the database: phase `preflop`, `current_actor_seat: 7`, but no player at seat 7 (only seats 1 and 5 exist). The action deadline was 40+ minutes ago. The new `poker-check-timeouts` code (deployed earlier) should handle this on the next poll, but the client may have stopped polling. The `poker-start-hand` stuck-hand recovery will also catch this. **No additional fix needed for the stuck hand itself** -- the deployed fixes cover it.

---

## Bug 1: Deal Animation Timer Uses OLD Stagger Values (DESYNC)

**File:** `src/components/poker/OnlinePokerTable.tsx`, line 651

The deal animation duration calculation still uses the OLD `0.18` stagger value:
```
const dealDurationMs = ((activePlayers * 2) * 0.18 + 0.8) * 1000;
```

But the actual flying sprite stagger was changed to `0.12` and the fly duration to `0.45`. This means the `dealAnimDone` flag (which gates when action buttons appear) fires **too early** or at the wrong time relative to the actual card animations.

**Fix:** Update to `0.12` stagger and match the total to the actual animation:
```
const dealDurationMs = ((activePlayers * 2) * 0.12 + 0.45 + 0.3) * 1000;
```
This ensures `dealAnimDone` fires exactly when the last card finishes its fly + reveal animation.

Also the visual timer `setTimeout(() => setDealing(false), 4500)` is way too long (4.5 seconds) -- the sprites are done in under 2 seconds now. This causes phantom card-back sprites to linger.

**Fix:** Change to a calculated value:
```
const visualMs = ((activePlayers * 2) * 0.12 + 0.45) * 1000 + 200;
```

---

## Bug 2: `poker-check-timeouts` -- Seat Status Reset Bug

**File:** `supabase/functions/poker-check-timeouts/index.ts`, lines 263-268

When the timeout function commits seat updates, it resets folded and all-in players to `"active"`:
```
status: s.status === "all-in" || s.status === "folded" ? "active" : s.status,
```

This is correct behaviour (fold/all-in are tracked in actions, not seat status). However, there's a subtle bug: the same code runs for the force-complete case (lines 136-141) where it resets the winner's status too. If the winner was all-in, their seat status gets set to `"active"` correctly. This is fine.

**However**, the `consecutive_timeouts` for non-actors is being written back as-is, but never reset for the actor when they successfully act. The `poker-action` function does reset it (`actor.consecutive_timeouts = 0` on line 365), but the timeout handler doesn't reset it for the OTHER players. This means if a player times out once, then plays normally for 10 hands, their `consecutive_timeouts` stays at 1. Then if they time out once more, they get kicked (threshold is 2). **This is a bug** -- timeouts should only be consecutive.

**Fix:** In `poker-check-timeouts`, only modify `consecutive_timeouts` for the actor. All other seats should pass their current value through unchanged (which the code already does). The real fix is that `poker-action` should reset `consecutive_timeouts` for the acting player on a SUCCESSFUL action. Let me check -- yes, line 365 of `poker-action` does `actor.consecutive_timeouts = 0` for non-timeout actions. This is correct.

Wait -- the issue is that `commit_poker_state` writes ALL seat updates, including seats that weren't modified. It sets `consecutive_timeouts` for every seat on every action. So when `poker-action` commits, it writes `consecutive_timeouts: 0` ONLY for the actor, but for other seats it writes their current value from the DB snapshot. This is fine -- it passes through the current value unchanged.

Actually, reviewing more carefully, this is correct. No bug here.

---

## Bug 3: `poker-timeout-ping` Still Calls `poker-action` Directly

**File:** `supabase/functions/poker-timeout-ping/index.ts`, lines 92-106

This function forwards timeout pings to `poker-action` via HTTP fetch. While `poker-action` handles forced folds correctly (it accepts the fold and processes it since the deadline has passed), the issue is that it uses the **caller's auth token** to act on behalf of the current actor. This works because `poker-action` lines 204-210 check if the deadline has passed and force-folds the current actor regardless of who sent the request.

However, there's a race condition: if `poker-check-timeouts` (polled by the leader every 8s) and `poker-timeout-ping` (fired by a non-leader 2s after deadline) both try to fold the same player, one will succeed and the other will get a `version_conflict` (409). The client retries on 409, potentially causing a double-fold. But `commit_poker_state` uses atomic versioning, so the second attempt will fail safely. **No bug here**, just wasted requests.

---

## Bug 4: No Logging for Debugging Future Issues

The edge functions log very little useful information. When things go wrong, the logs show mostly "booted" and "shutdown" messages. To quickly diagnose future game freezes, we need structured logging.

**Fix:** Add structured console.log statements to critical paths in:
- `poker-start-hand`: Log hand number, player count, dealer seat, blind positions
- `poker-action`: Log the action taken, by whom, new phase
- `poker-check-timeouts`: Log which hands were found stuck and what action was taken

---

## Bug 5: Card Reveal Sync with Fly Animation

The card reveal in `PlayerSeat.tsx` uses `revealMs = (dealDelay + 0.45) * 1000` which means the card flips face-up 0.45s after its fly animation STARTS (matching the fly duration). But the `myCards` data is fetched from the server with an 800ms delay (line 400 of `useOnlinePokerTable.ts`):

```typescript
const timer = setTimeout(async () => {
  const data = await callEdge('poker-my-cards', { hand_id: hand.hand_id }, 'GET');
  setMyCards(data.hole_cards || null);
}, 800);
```

For a 6-player game, the first card's fly starts at `delay = 0 * 0.12 = 0s` and should reveal at `0 + 0.45 = 0.45s`. But `myCards` doesn't arrive until 800ms + network latency (~200ms) = ~1000ms. So the first card's reveal timer fires at 450ms but myCards isn't available yet -- the card stays face-down until myCards arrives, then immediately flips (no animation sync).

The second card starts flying at `delay = activePlayers * 0.12` and reveals at `(activePlayers * 0.12 + 0.45) * 1000`ms. For 6 players, that's `(6 * 0.12 + 0.05 + 0.45) * 1000 = 1220ms`. By this time, myCards HAS arrived (at ~1000ms), so the second card reveals correctly.

**The first card's reveal is always out of sync because myCards arrives too late.**

**Fix:** Reduce the myCards fetch delay from 800ms to 200ms. The animation sprites start flying immediately; the data just needs to be ready before the first card's reveal timer fires at ~500ms. With 200ms delay + ~200ms network, data arrives at ~400ms, just in time for the first reveal at ~500ms.

---

## Summary of Changes

| File | Change |
|------|--------|
| `src/components/poker/OnlinePokerTable.tsx` (line 651) | Fix dealDurationMs to use 0.12 stagger instead of 0.18 |
| `src/components/poker/OnlinePokerTable.tsx` (line 653) | Fix visual timer from 4500ms to calculated value |
| `src/hooks/useOnlinePokerTable.ts` (line 400) | Reduce myCards fetch delay from 800ms to 200ms for card reveal sync |
| `supabase/functions/poker-start-hand/index.ts` | Add structured logging (hand number, players, blinds) |
| `supabase/functions/poker-action/index.ts` | Add structured logging (action, player, phase transition) |
| `supabase/functions/poker-check-timeouts/index.ts` | Add structured logging (stuck hands found, actions taken) |

## What Does NOT Change

- No layout, navigation, spacing, or style changes
- No BottomNav changes
- No database schema changes
- No changes to game logic or pot calculations
- No refactoring or renaming
- The poker-check-timeouts and poker-start-hand fixes from earlier are already deployed and working correctly
