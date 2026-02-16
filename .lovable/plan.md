
# Add Blind Timer Settings + Manual Deal Button for Multiplayer

## Issue 1: Blind Increase Timer Missing from Table Creation

The bot lobby (`PlayPokerLobby`) has a "Blind Timer" setting with options (Off, 5m, 10m, 15m, 30m), but the multiplayer "Create Table" dialog in `OnlinePokerLobby` does not. We need to add this setting and store it in the database.

### Database Migration
Add a `blind_timer_minutes` column to `poker_tables`:
```sql
ALTER TABLE public.poker_tables ADD COLUMN blind_timer_minutes integer NOT NULL DEFAULT 0;
```
A value of `0` means "off" (no auto-increase). Values like 5, 10, 15, 30 mean blinds increase every N minutes.

### Edge Function: `poker-create-table/index.ts`
- Accept `blind_timer_minutes` from the request body (default 0).
- Store it in the inserted row.

### UI: `OnlinePokerLobby.tsx`
- Add a `blindTimer` state (default 0).
- Add the same pill-button row used in `PlayPokerLobby` (Off / 5m / 10m / 15m / 30m) inside the Create Table dialog.
- Pass `blind_timer_minutes: blindTimer` to the `poker-create-table` call.

### Types: `online-types.ts`
- Add `blind_timer_minutes: number` to `OnlineTableInfo`.

**Note**: The actual blind increase logic (incrementing blinds during play) is a deeper server-side feature that would require additional edge function work. This change stores the setting so it can be used later. For now, the setting will be saved and displayed.

---

## Issue 2: Game Not Starting -- Add Manual "Deal" Button

The auto-deal system has proven unreliable due to race conditions between multiple clients. Adding a manual "Deal" button as a fallback ensures the table creator can always start the game.

### Changes in `OnlinePokerTable.tsx`
- At line 545 (where the comment says "Deal button removed"), add a "Deal" button visible only to the **table creator** (`user?.id === tableState?.table.created_by`).
- The button appears when:
  - There are 2+ active seated players
  - No hand is currently in progress
  - The user is the table creator
- Clicking it calls `startHand()`.
- This is a fallback alongside the existing auto-deal logic.

```text
[ Deal Hand ]  -- shown center-table, below community cards area
```

---

## Summary

| # | Change | Files |
|---|--------|-------|
| 1 | Add `blind_timer_minutes` column | DB migration |
| 2 | Accept blind timer in create-table | `poker-create-table/index.ts` |
| 3 | Add blind timer UI to Create Table dialog | `OnlinePokerLobby.tsx` |
| 4 | Add `blind_timer_minutes` to types | `online-types.ts` |
| 5 | Add manual "Deal" button for table creator | `OnlinePokerTable.tsx` |
