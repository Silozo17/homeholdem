
# Add Table Join Notifications (Opt-In Bell Icon)

## Overview

Users can subscribe to individual poker tables in the lobby. When subscribed, they receive in-app and push notifications whenever someone joins that table -- unless they themselves are already seated at it.

## Implementation

### 1. New Database Table: `poker_table_watchers`

Stores which users are watching which tables.

```sql
CREATE TABLE poker_table_watchers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_id uuid NOT NULL REFERENCES poker_tables(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(table_id, user_id)
);

ALTER TABLE poker_table_watchers ENABLE ROW LEVEL SECURITY;

-- Users can see their own watches
CREATE POLICY "Users can view own watches"
  ON poker_table_watchers FOR SELECT
  USING (auth.uid() = user_id);

-- Users can add watches
CREATE POLICY "Users can add watches"
  ON poker_table_watchers FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can remove watches
CREATE POLICY "Users can remove watches"
  ON poker_table_watchers FOR DELETE
  USING (auth.uid() = user_id);
```

### 2. Update `poker-join-table` Edge Function

After successfully inserting the seat, query `poker_table_watchers` for all watchers of this table. Exclude:
- The joining player themselves
- Any user currently seated at the table

For each eligible watcher:
- Insert an in-app notification into `notifications` table
- Call the `send-push-notification` function internally (or insert push logic inline)

The notification will say:
- Title: "Player Joined"
- Body: "{display_name} joined {table_name}"
- URL: `/online-poker?table={table_id}`

### 3. Bell Icon in Lobby Table List

In `OnlinePokerLobby.tsx`:

- On mount, fetch all `poker_table_watchers` rows for the current user to build a `Set<string>` of watched table IDs
- For each table card, add a bell icon button (between the delete button and status badge)
- Clicking the bell toggles the watch: insert or delete from `poker_table_watchers`
- The bell is filled/highlighted when watching, outlined when not
- Click stops propagation so it doesn't trigger table join

### 4. Translation Keys

Add to `en.json` and `pl.json`:
- `poker_online.watch_table` / `poker_online.unwatch_table` (for aria-labels)
- Notification strings are hardcoded in the edge function (server-side, no i18n needed)

## File Changes

| File | Change |
|------|--------|
| Migration (SQL) | Create `poker_table_watchers` table with RLS |
| `supabase/functions/poker-join-table/index.ts` | After seat insert, notify watchers (in-app + push) |
| `src/components/poker/OnlinePokerLobby.tsx` | Fetch watched tables, render bell icon, toggle handler |
| `src/i18n/locales/en.json` | Add watch/unwatch labels |
| `src/i18n/locales/pl.json` | Add Polish translations |

## What Does NOT Change

- No navigation, bottom nav, or layout changes
- No changes to game engine or hand evaluation
- No changes to existing notification types or preferences
- No notifications for any table event other than player joins
- Users seated at the table do NOT receive the notification
