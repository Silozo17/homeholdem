

# Fix: New Players Joining Mid-Hand Should Spectate Until Next Hand

## Problem

When a player joins an ongoing hand (e.g. during the flop), they are inserted into `poker_seats` with `status: 'active'`. This causes two issues:

1. They appear as an active player mid-hand, even though they were not dealt cards
2. They cannot see any cards because no hole cards were dealt for them -- they were not part of the hand

## Root Cause

`poker-join-table` always inserts seats with `status: 'active'` regardless of whether a hand is in progress. Meanwhile, `poker-start-hand` only deals cards to seats that are `active` at the time the hand starts.

## Fix (2 files, server-side only)

### 1. `supabase/functions/poker-join-table/index.ts`

Before inserting the seat, check if a hand is currently in progress at the table. If so, insert with `status: 'sitting_out'` instead of `'active'`.

```typescript
// After the existing seat/table validation, before inserting:

// Check if a hand is in progress
const { data: activeHand } = await admin
  .from("poker_hands")
  .select("id")
  .eq("table_id", table_id)
  .is("completed_at", null)
  .limit(1)
  .maybeSingle();

const initialStatus = activeHand ? "sitting_out" : "active";

// Insert seat (change "active" to initialStatus)
const { data: seat, error: seatErr } = await admin
  .from("poker_seats")
  .insert({
    table_id,
    seat_number,
    player_id: user.id,
    stack: buy_in_amount,
    status: initialStatus,
  })
  .select()
  .single();
```

### 2. `supabase/functions/poker-start-hand/index.ts`

Before querying active seats for dealing, promote all `sitting_out` seats (with chips) to `active`. This ensures players who joined during the previous hand participate in the next one.

```typescript
// Before the existing "Get active seats" query (around line 210):

// Activate sitting_out players for the new hand
await admin
  .from("poker_seats")
  .update({ status: "active" })
  .eq("table_id", table_id)
  .eq("status", "sitting_out")
  .gt("stack", 0);
```

## What Does NOT Change

- No client-side code changes
- No style, layout, navigation, or UI changes
- No changes to BottomNav or any other component
- No refactoring or renaming
- The `poker-action`, `poker-table-state`, and all other edge functions remain untouched

## Why This Fixes It

- Players joining mid-hand get `sitting_out` status, so they are not treated as active participants (no cards expected, no turn expected)
- When the next hand starts, all `sitting_out` players are promoted to `active` and dealt cards normally
- The client already handles `sitting_out` seats correctly in the display logic
- The "can't see cards" issue is resolved because players will only be `active` when a hand starts and cards are dealt to them

