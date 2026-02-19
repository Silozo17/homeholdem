
# Merge Wuzet Accounts

## Current State

| Record | ID | Has Stats? | Has Avatar? |
|---|---|---|---|
| Registered user "Wuzet" | `f3bb9039-6586-4614-ac89-fe0feda4286f` | No game_players records | Yes (avatar + email) |
| Placeholder "Wuzet" | `ccff627b-d8a3-4ccf-8931-5da2eb476d13` | 2 games, 1 win, 300 winnings | No linked_user_id |
| Season standing | `8d30af27-...` | Points to placeholder only | user_id is NULL |

## Fix (same pattern as Breku merge)

Two SQL updates via a database migration:

1. **Link placeholder to registered user**
   - Set `linked_user_id` on the placeholder_players row to the registered user's ID

2. **Update season standings**
   - Set `user_id` on the season_standings row so leaderboard and profile stats aggregate correctly

```sql
UPDATE placeholder_players
SET linked_user_id = 'f3bb9039-6586-4614-ac89-fe0feda4286f'
WHERE id = 'ccff627b-d8a3-4ccf-8931-5da2eb476d13';

UPDATE season_standings
SET user_id = 'f3bb9039-6586-4614-ac89-fe0feda4286f'
WHERE placeholder_player_id = 'ccff627b-d8a3-4ccf-8931-5da2eb476d13'
  AND user_id IS NULL;
```

## Result
- Profile page will show Wuzet's 2 games, 1 win, and 300 winnings
- Leaderboard will display the avatar and registered name
- No code file changes needed
- No UI or navigation changes

## Files changed

| File | Change |
|---|---|
| Database migration only | Link placeholder + update season standings |
