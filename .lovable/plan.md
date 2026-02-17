

# Fix: 3 Issues — Card Speed, Button Visibility, All-In Bug

## Issue 1: 2nd Card Deals Too Slowly

The card stagger delay between cards is 0.35 seconds per dealing step. With 5 players, the 2nd card arrives ~1.75s after the 1st card, which feels slow.

**Fix:** Reduce the stagger multiplier from `0.35` to `0.18` in two places:

**File 1:** `src/components/poker/PlayerSeat.tsx` (line 100)
- Before: `(i * totalActivePlayers + seatDealOrder) * 0.35 + 0.1`
- After: `(i * totalActivePlayers + seatDealOrder) * 0.18 + 0.1`

**File 2:** `src/components/poker/OnlinePokerTable.tsx` (line 604)
- Before: `((activePlayers * 2) * 0.35 + 0.8) * 1000`
- After: `((activePlayers * 2) * 0.18 + 0.8) * 1000`

This cuts the gap between cards in half — the 2nd card now arrives ~0.9s after the 1st instead of ~1.75s.

---

## Issue 2: Buttons Not Showing

The fix from this session (removing `tableState?.seats` from the deal animation effect dependency array) should resolve this. If players are still seeing the issue, they need to refresh their browser to load the updated code. No additional code change needed.

---

## Issue 3: All-In Does Not Let Opponent Respond (CRITICAL)

### Root Cause

In `poker-action/index.ts`, line 380-381:

```typescript
} else if (activePlayers.length === 0 || 
           (activePlayers.length === 1 && allInPlayers.length > 0)) {
  roundComplete = true;
}
```

When a player goes all-in as a RAISE (above the current bet), this condition triggers immediately because there's 1 active player left and 1+ all-in players. The remaining active player never gets a chance to call or fold.

**Proof from "Wieczorny Pokerek" hand 5:**
- Amir raised 7,600 on the river
- Tomek went all-in for 16,600 (a raise over Amir's bet)
- The system treated the round as complete immediately, skipping Amir's turn
- Cards ran out — Amir had One Pair (Aces), Tomek had High Card
- The pot was awarded to Tomek because Amir was marked ineligible (never matched the all-in bet)
- Amir lost 10,400 chips to a worse hand he would have called

### Fix

**File:** `supabase/functions/poker-action/index.ts` (lines 380-381)

Remove the short-circuit condition. Only auto-complete the round when zero active players remain (everyone is all-in or folded):

Before:
```typescript
} else if (activePlayers.length === 0 || 
           (activePlayers.length === 1 && allInPlayers.length > 0)) {
  roundComplete = true;
```

After:
```typescript
} else if (activePlayers.length === 0) {
  roundComplete = true;
```

The normal round-completion check at lines 385-388 (all acted and bets equal) already handles the case where the last active player has matched the all-in.

---

## Summary

| Issue | File | Change |
|-------|------|--------|
| Card speed | PlayerSeat.tsx, OnlinePokerTable.tsx | Reduce stagger 0.35 to 0.18 |
| Buttons missing | Already fixed | Players should refresh browser |
| All-in skips opponent | poker-action/index.ts | Remove premature round-complete condition |

## What Does NOT Change

- No style, layout, navigation, or spacing changes
- No changes to BottomNav or any other component
- No refactoring or renaming
- Card display, seat layout, and all other UI unchanged
- Only the 3 specific values listed above are modified

