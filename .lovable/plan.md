

# Full Plan: Private/Community Tables, Description Field, Fixed 9 Seats, and 4-Hour Community Closure

## What You Get

- **Private tables**: Hidden from the lobby entirely -- only joinable via invite code
- **Community tables**: Permanent tables visible to everyone, stay open until the owner removes them
- **4-hour closure delay**: When an owner closes a community table with players inside, it schedules deletion 4 hours later. No new players can join during this time, and a red countdown timer appears in the bottom-left of the table
- **Optional description**: Every table can have a short description shown in the lobby
- **All tables are 9 seats**: No more seat slider

---

## 1. Database Migration

### A. Add enum values
```sql
ALTER TYPE poker_table_type ADD VALUE 'private';
ALTER TYPE poker_table_type ADD VALUE 'community';
```

### B. Add columns to `poker_tables`
- `description TEXT DEFAULT NULL`
- `is_persistent BOOLEAN NOT NULL DEFAULT false`
- `closing_at TIMESTAMPTZ DEFAULT NULL`

### C. Replace the SELECT RLS policy on `poker_tables`
Drop existing "Users can view relevant tables" and create a new one that adds:
- `private` tables: visible only to creator or players with a seat at that table
- `community` tables: visible to everyone (like public)

---

## 2. Edge Function Changes (5 files)

### A. `poker-create-table/index.ts`
- Accept `description` from request body
- Force `max_seats = 9` always (ignore client value)
- Accept `'private'` and `'community'` as valid `table_type` values
- Set `is_persistent = true` when `table_type === 'community'`
- Pass `description` and `is_persistent` to the DB insert
- Do NOT auto-seat creator for community tables (they can join like anyone else)

### B. `poker-join-table/index.ts`
- After fetching the table, block joins if `closing_at` is set:
  ```
  if (table.closing_at) return 400: "Table is closing"
  ```

### C. `poker-moderate-table/index.ts`
- For `action === "close"` on a community/persistent table WITH seated players:
  - Set `closing_at = now() + 4 hours` instead of instant delete
  - Broadcast `table_closing` event with the `closing_at` timestamp
- For community tables with NO players, or non-community tables: instant delete (existing behavior)
- Add `action === "cancel_close"`: clears `closing_at` and broadcasts `table_closing_cancelled`

### D. `poker-table-state/index.ts`
- Include `description`, `is_persistent`, and `closing_at` in the table response object

### E. `poker-check-timeouts/index.ts`
- Add a sweep at the end: find tables where `closing_at <= now()`, force-complete hands, broadcast `table_closed`, cascade-delete everything

---

## 3. Frontend Changes (4 files)

### A. `src/lib/poker/online-types.ts`
- Add to `OnlineTableInfo`: `description`, `is_persistent`, `closing_at`
- Update `table_type` union: `'public' | 'friends' | 'club' | 'private' | 'community'`
- Add `description` to `CreateTableParams`, remove `max_seats`

### B. `src/components/poker/OnlinePokerLobby.tsx`
- **Remove** the Max Seats slider entirely
- **Add** a description textarea (optional, max 200 chars) in create dialog
- **Add** Private and Community options to the type selector
- **Add** "Community" filter tab
- Show description below table name in the lobby list
- Show shield icon for Private, globe icon for Community, "Permanent" badge for community tables
- Show "Closing" badge on tables with `closing_at` set
- Update delete confirmation for community tables to mention the 4-hour delay
- Always send `max_seats: 9` to the edge function

### C. `src/hooks/useOnlinePokerTable.ts`
- Handle `table_closing` broadcast: update `tableState.table.closing_at` locally
- Handle `table_closing_cancelled` broadcast: clear `closing_at`

### D. `src/components/poker/OnlinePokerTable.tsx`
- Add a `TableClosingTimer` component:
  - Positioned bottom-left corner, above safe area
  - Red `XCircle` icon + countdown in `HH:MM:SS` format
  - Text: "Closing in X:XX:XX"
  - Red/dark background pill
  - Updates every second via `setInterval`
  - Rendered when `tableState?.table?.closing_at` is set
- When countdown reaches 0, the `poker-check-timeouts` sweep handles deletion and broadcasts `table_closed`, which already navigates the player out

---

## Files Changed Summary

| File | Change |
|------|--------|
| Migration SQL | Add enum values, 3 columns, update RLS |
| `supabase/functions/poker-create-table/index.ts` | Accept description, force 9 seats, handle private/community |
| `supabase/functions/poker-join-table/index.ts` | Block joins when `closing_at` is set |
| `supabase/functions/poker-moderate-table/index.ts` | 4h scheduled close for community + cancel_close action |
| `supabase/functions/poker-table-state/index.ts` | Return description, is_persistent, closing_at |
| `supabase/functions/poker-check-timeouts/index.ts` | Sweep and delete tables past closing_at |
| `src/lib/poker/online-types.ts` | Add new fields and type values |
| `src/components/poker/OnlinePokerLobby.tsx` | Remove seat slider, add description, new types, new filters |
| `src/hooks/useOnlinePokerTable.ts` | Handle table_closing / table_closing_cancelled broadcasts |
| `src/components/poker/OnlinePokerTable.tsx` | Add TableClosingTimer (red X + countdown, bottom-left) |

