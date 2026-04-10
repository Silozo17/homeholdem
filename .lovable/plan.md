

# Fix: Deal Hand Button Flashing & False Inactivity Kick

## Issue 1: "Deal Hand" button appears every round

**Root cause**: Line 961 in `OnlinePokerTable.tsx` shows the button when `!hand && !autoStartAttempted`. But between hands, `autoStartAttempted` is reset to `false` (line 379 in `useOnlinePokerTable.ts`) before auto-start fires ~1.2s later. This creates a visible flash of the button every round.

**Fix**: Add `&& !handHasEverStarted` back to the button condition. The button should only appear for the very first hand on a table. After that, auto-start handles dealing.

**File**: `src/components/poker/OnlinePokerTable.tsx` line 961
```
// Before:
{isSeated && !hand && !autoStartAttempted && activeSeats.length >= 2 && (

// After:
{isSeated && !hand && !autoStartAttempted && !handHasEverStarted && activeSeats.length >= 2 && (
```

## Issue 2: Player who lost (busted) sees "Removed for inactivity"

**Root cause**: In `poker-start-hand/index.ts` line 255, when a player with 0 chips is auto-removed at the start of the next hand, the server broadcasts `action: "kicked"`. The client (line 240 in `usePokerBroadcast.ts`) treats all `kicked` broadcasts as inactivity removals and shows the "Removed for inactivity" toast.

**Fix**: Two changes:
1. In `poker-start-hand/index.ts`, change the busted player broadcast from `action: "kicked"` to `action: "busted"` so it's distinguishable from actual inactivity kicks.
2. In `usePokerBroadcast.ts` line 240, only trigger `kickedForInactivity` for `action === 'force_removed'` (long disconnect) — not for `kicked` (consecutive timeouts) or `busted` (zero chips). The `kicked` action from `poker-check-timeouts` and `poker-moderate-table` should just silently remove the seat without the misleading "inactivity" message.

**Files**:
- `supabase/functions/poker-start-hand/index.ts` line 255: change `"kicked"` to `"busted"`
- `src/hooks/usePokerBroadcast.ts` line 240: only match `action === 'force_removed'`

## Summary
- 2 client files changed, 1 edge function redeployed
- No layout, navigation, or styling changes
- No database changes

