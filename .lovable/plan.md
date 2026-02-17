

# Combined Fix: Game Freeze + Raise-Folds-Instead + Mid-Hand Join

Three critical bugs are addressed together.

---

## Bug 1: Game Freezes After One Hand (Broken Auto-Fold Timeout)

### Root Cause
When a player times out, `poker-check-timeouts` calls `poker-action` with a service role key. But `poker-action` calls `supabase.auth.getUser()` which returns NULL for a service role key (it's not a user JWT), returning **401 Unauthorized**. The auto-fold silently fails, the hand stays stuck forever, and auto-deal can never start the next hand.

Additionally, the logs show `"No actor found for hand eae5408e"` -- the player at seat 7 left the table, but the hand's `current_actor_seat` still points to their now-empty seat. The timeout system can't resolve this either.

### Fix

**File: `supabase/functions/poker-check-timeouts/index.ts`** -- Complete rewrite to use direct DB operations (`read_poker_hand_state` + `commit_poker_state`) instead of calling `poker-action`. This:
- Reads hand state directly via the service role client
- Finds the current actor's seat and marks them as folded
- If only 1 non-folded player remains: completes the hand and awards pot
- If more players remain: finds the next actor and sets a new deadline
- Commits atomically via `commit_poker_state`
- Broadcasts the updated game state via Realtime
- Handles the edge case where the actor has LEFT the table (empty seat)

**File: `supabase/functions/poker-start-hand/index.ts`** -- Add stuck-hand recovery: before returning "Hand already in progress", check if the stuck hand's `action_deadline` is more than 60 seconds old. If so, force-complete it and proceed with the new hand. This is a safety net for when even the timeout system fails.

---

## Bug 2: "Raise" Button Folds Instead

### Root Cause
On mobile touch screens, when the raise slider is open and the player taps the "Raise" button to confirm their raise, the touch event can accidentally register on the **Fold** button. This happens because:
1. All three buttons (Fold / Call / Raise) are in a tight `flex gap-2` row
2. On small screens, buttons are very close together
3. Touch targets are imprecise -- a slight finger drift from Raise to Fold triggers the wrong action
4. There is NO confirmation step for Fold -- it fires immediately on tap

### Fix

**File: `src/components/poker/BettingControls.tsx`**:
- When the raise slider is open (`showRaiseSlider === true`), **disable the Fold button** by adding `pointer-events-none` and reducing opacity. This prevents accidental folds while the player is adjusting their raise amount.
- Add a "Cancel" button to close the raise slider without folding, giving the player a safe way to back out.
- This keeps the layout identical and only changes behavior when the slider panel is visible.

---

## Bug 3: Players Joining Mid-Hand Get Dealt Cards Immediately

### Root Cause
When a player joins mid-hand, `poker-join-table` correctly sets their status to `sitting_out`. However, at the start of the NEXT hand, `poker-start-hand` runs this code (lines 210-216):

```
UPDATE poker_seats SET status = 'active'
WHERE table_id = X AND status = 'sitting_out' AND stack > 0
```

This activates ALL sitting-out players, including those who literally just joined seconds ago. They are then dealt cards and included in blinds. This is correct behavior for the NEXT hand -- but the user is reporting that players are dealt into the CURRENT hand. This can happen if auto-deal fires immediately after the join (within the same second), because the hand completes very quickly (e.g., everyone folds) and the new hand starts before the new player's client has even loaded.

The real issue is that the game_state broadcast from `poker-start-hand` includes ALL active seats. The joining player sees themselves with `has_cards: true` and gets dealt in.

### Fix

**File: `supabase/functions/poker-join-table/index.ts`**:
- Add a `skip_until_hand` column concept: when a player joins mid-hand, record the current active hand ID. In `poker-start-hand`, only activate sitting_out players whose `skip_until_hand` matches a COMPLETED hand or is NULL.

Actually, the simpler fix (no schema change needed):

**File: `supabase/functions/poker-start-hand/index.ts`**:
- After activating sitting_out players, only deal cards to players who were active BEFORE the activation. Instead, change the activation timing: activate sitting_out players AFTER checking the active hand count but BEFORE dealing, so they are included in the hand. The current code already does this correctly.

The real fix is in **`poker-join-table/index.ts`**: when joining mid-hand, set `last_action_at` to a future timestamp (e.g., now + 30s) as a "cooldown marker". Then in `poker-start-hand`, only activate sitting_out players whose `last_action_at` is in the past. This ensures players who JUST joined don't get activated for the very next hand if it starts within seconds.

Simpler approach: In `poker-start-hand`, don't activate players who joined within the last 3 seconds (`joined_at` is recent). This prevents the race condition without schema changes.

---

## Files Changed

| File | Change |
|------|--------|
| `supabase/functions/poker-check-timeouts/index.ts` | Rewrite to use direct DB operations (no more calling poker-action) |
| `supabase/functions/poker-start-hand/index.ts` | Add stuck-hand recovery (force-complete if deadline 60s+ overdue); skip activating players who joined within 3 seconds |
| `supabase/functions/poker-join-table/index.ts` | No changes needed (already correctly sets sitting_out) |
| `src/components/poker/BettingControls.tsx` | Disable Fold button while raise slider is open to prevent accidental folds |

## What Does NOT Change

- No layout, navigation, spacing, or style changes outside the betting controls
- No BottomNav changes
- No changes to poker-action edge function
- No database schema changes
- No refactoring or renaming

