
# Add Delete Table Button for Table Owners in Lobby

## What changes

Add a delete (trash) icon button on each table card in the lobby that only appears for the table creator. Tapping it shows a confirmation dialog, then calls the existing `poker-moderate-table` edge function with `action: 'close'` to remove all seats and mark the table as closed.

## Technical details

### File: `src/components/poker/OnlinePokerLobby.tsx`

1. Import `Trash2` from lucide-react and `AlertDialog` components
2. Add state for `deleteTarget` (table id + name being deleted)
3. On each table card, if `t.created_by === user?.id`, render a small trash icon button (with `e.stopPropagation()` to prevent joining the table)
4. Clicking it sets `deleteTarget`, which opens an `AlertDialog` confirmation
5. On confirm, call the existing `callEdge('poker-moderate-table', { table_id, action: 'close' })`, then refresh the table list
6. Filter out `closed` tables from the lobby list (if not already filtered)

No new edge functions or database changes needed -- reuses the existing `poker-moderate-table` close action.
