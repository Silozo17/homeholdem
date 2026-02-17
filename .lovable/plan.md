

# Fix: Blind Timer Starts on First Hand Deal, Not Table Creation

## Problem

Currently, `last_blind_increase_at` is set to `new Date().toISOString()` when the table is created (`poker-create-table/index.ts` line 113). This means if a player creates a table and waits 10 minutes for friends to join before starting, the blinds may have already escalated by the time the first hand is dealt.

## Solution

Three small, targeted changes:

### 1. `poker-create-table/index.ts` -- Set `last_blind_increase_at` to null

Instead of `new Date().toISOString()`, set it to `null` at creation time. The timer hasn't started yet because no hand has been dealt.

**Change**: Line 113, replace `last_blind_increase_at: new Date().toISOString()` with `last_blind_increase_at: null`.

### 2. `poker-start-hand/index.ts` -- Initialize timer on first hand

In the blind escalation block (lines 138-169), if `last_blind_increase_at` is null (meaning this is the first hand), set it to now and skip escalation. This anchors the blind timer to the moment the first hand is dealt.

**Change** at line 142:
```
if (table.blind_timer_minutes > 0) {
  if (!table.last_blind_increase_at) {
    // First hand -- start the blind timer NOW
    const now = new Date().toISOString();
    await admin.from("poker_tables")
      .update({ last_blind_increase_at: now })
      .eq("id", table_id);
    table.last_blind_increase_at = now;
  } else {
    // Existing escalation logic (unchanged)
    const lastIncrease = new Date(table.last_blind_increase_at).getTime();
    ...
  }
}
```

Also update the fallback at line 503 to not inject a fake timestamp:
```
last_blind_increase_at: table.last_blind_increase_at || null,
```

Similarly in `poker-table-state/index.ts` line 191, stop falling back to `new Date().toISOString()`:
```
last_blind_increase_at: table.last_blind_increase_at || null,
```

### 3. UI -- Hide blind timer until first hand is dealt

The `OnlineBlindTimer` component at `OnlinePokerTable.tsx` line 787 already has a guard: `table.blind_timer_minutes > 0 && table.last_blind_increase_at`. Since `last_blind_increase_at` will now be null until the first hand, the timer countdown simply won't render in the header until then. No UI code change needed.

## Files Changed

| File | Change |
|------|--------|
| `supabase/functions/poker-create-table/index.ts` | Set `last_blind_increase_at: null` instead of `new Date().toISOString()` |
| `supabase/functions/poker-start-hand/index.ts` | Initialize `last_blind_increase_at` to now on first hand; remove fallback at line 503 |
| `supabase/functions/poker-table-state/index.ts` | Remove fallback `new Date().toISOString()` for `last_blind_increase_at` |

No database migration needed -- the column is already nullable (`last_blind_increase_at: string`).

