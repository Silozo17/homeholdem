

# Two Changes: Inactivity Kick + Card Deal Stagger Slowdown

## 1. Inactivity Kick: Remove from Table Completely + Popup

### Current behavior
- Server: Players with 3+ consecutive timeouts get their seat cleared, and a `seat_change` broadcast with `action: "leave"` is sent
- Client: The `seat_change` `leave` handler only clears the seat locally -- the kicked player stays on the table screen with no feedback

### Changes

**A. Server: Change broadcast to include a `kicked` flag (1 file)**

**File:** `supabase/functions/poker-check-timeouts/index.ts`
- In the auto-kick section (~line 428-432), change the broadcast payload from `{ action: "leave", seat, player_id }` to `{ action: "kicked", seat, player_id }`

**B. Client: Handle `kicked` event to navigate player away (1 file)**

**File:** `src/hooks/useOnlinePokerTable.ts`
- In the `seat_change` broadcast handler (~line 265-283), add a new case for `action === 'kicked'`:
  - Clear the seat locally (same as leave)
  - If the kicked player_id matches the current userId, set a new state flag `kickedForInactivity = true`
- Expose `kickedForInactivity` in the hook return

**File:** `src/components/poker/OnlinePokerTable.tsx`
- Add a `useEffect` watching `kickedForInactivity`:
  - When true, show a toast/alert: "Removed for inactivity"
  - Call `onLeave()` to navigate back to the menu

**C. Halve the inactivity threshold (1 file)**

**File:** `supabase/functions/poker-check-timeouts/index.ts`
- Change the consecutive timeout threshold from `3` to `2` (line 411: `.gte("consecutive_timeouts", 3)` becomes `.gte("consecutive_timeouts", 2)`)

---

## 2. Card Dealing Animation: Slow Down the Stagger by 2x

### Current behavior
- The stagger between each card being dealt to players is `0.15s` per card-seat step (PlayerSeat.tsx line 105 and 122)
- The `card-arrive` CSS animation (the slide itself) is already `0.5s`
- The base offset before reveal is `0.45s`

### What "sliding cards to players" means
The stagger multiplier (`0.15`) controls the delay between each card being dealt sequentially. Doubling this from `0.15` to `0.30` will make the dealing sequence take 2x longer overall -- cards arrive one by one more slowly.

### Changes

**File:** `src/components/poker/PlayerSeat.tsx`
- Line 105: Change `0.15` to `0.30`
- Line 122: Change `0.15` to `0.30`

No other files or animations are changed.

---

## Summary of Files Changed

| File | Change |
|------|--------|
| `supabase/functions/poker-check-timeouts/index.ts` | Broadcast `kicked` action + threshold from 3 to 2 |
| `src/hooks/useOnlinePokerTable.ts` | Handle `kicked` action, expose `kickedForInactivity` flag |
| `src/components/poker/OnlinePokerTable.tsx` | React to kick flag: show popup + navigate to menu |
| `src/components/poker/PlayerSeat.tsx` | Stagger `0.15` to `0.30` (2 lines) |

