

# Paid Tournament Behaviour Updates

## Summary

Five changes to tournament logic:

1. **Admin bypasses Level 5 gate** -- the app admin (`amir_wanas@wp.pl`) can register without meeting the level requirement
2. **Random seat allocation** -- seats are already randomly shuffled; no change needed (confirmed in `paid-tournament-start`)
3. **Registration closes 1 minute before start** -- players cannot register within the final 60 seconds before `start_at`
4. **Early table join** -- paid players can join and wait at the table up to 15 minutes before the tournament begins
5. **Chips carry over on table merge** -- already implemented (stacks are preserved during moves in `paid-tournament-tick`); no change needed

---

## Technical Details

### 1. Admin Level 5 Bypass

**Files:** `paid-tournament-register/index.ts`, `src/pages/PaidTournaments.tsx`, `src/components/poker/PaidTournamentDetail.tsx`

- **Edge function** (`paid-tournament-register`): After fetching the user, check if they are in `app_admins`. If yes, skip the Level 5 gate entirely.
- **Frontend** (`PaidTournaments.tsx`): The `handleRegister` function currently blocks locally if `playerLevel < 5`. Add a check: if `isAdmin`, skip the level toast and proceed to the edge function.
- **Frontend** (`PaidTournamentDetail.tsx`): The Register button is currently disabled when `playerLevel < 5`. Pass `isAdmin` prop through and allow the button to remain enabled for admins regardless of level.

### 2. Registration Closes 1 Minute Before Start

**Files:** `paid-tournament-register/index.ts`, `src/components/poker/PaidTournamentDetail.tsx`

- **Edge function**: After checking `tournament.status === "scheduled"`, add a time check:
  ```
  if (start_at - now < 60 seconds) return error "Registration closed"
  ```
- **Frontend**: Show "Registration Closing Soon" or disable the Register button when less than 60 seconds remain before `start_at`. Use a simple interval to check the countdown.

### 3. Early Table Join (15 Minutes Before Start)

**Files:** `paid-tournament-start/index.ts`, `src/components/poker/PaidTournamentDetail.tsx`

- **Edge function** (`paid-tournament-start`): Change the auto-start trigger. Currently tables are created at `start_at`. Instead:
  - Create tables and seat players **15 minutes before** `start_at` (status remains `scheduled`, but tables exist)
  - Add a new intermediate state: set a `tables_created_at` timestamp on `paid_tournaments` (or reuse `started_at` for table creation and add a separate `game_started_at`)
  - At `start_at`, change status to `running` and begin blind clock
- **Alternative simpler approach**: Create tables when `start_at - 15min <= now` but keep tournament status as `scheduled`. At `start_at`, flip to `running` and start blinds.
- **Frontend**: When a paid player sees a `scheduled` tournament within 15 minutes of start, show a "Join Table" button that navigates them to their assigned table. The table exists but no hands are dealt until `running`.
- **`paid-tournament-tick`**: Update the cron logic to:
  1. Create tables at `start_at - 15min` (seat players, set `tables_created_at`)
  2. Start tournament at `start_at` (set status to `running`, begin blinds)

**Database migration**: Add `tables_created_at timestamptz` column to `paid_tournaments` to track when tables were created (separate from `started_at` which means blinds are running).

### 4. No Changes Needed (Confirmed)

- **Random seating**: Already uses `players.sort(() => Math.random() - 0.5)` for shuffle
- **Chips carry on merge**: `paid-tournament-tick` already copies `player.stack` when moving between tables

---

## Files Changed

| File | Change |
|------|--------|
| `supabase/migrations/xxx_add_tables_created_at.sql` | Add `tables_created_at` column to `paid_tournaments` |
| `supabase/functions/paid-tournament-register/index.ts` | Admin bypass Level 5; registration closes 1min before start |
| `supabase/functions/paid-tournament-start/index.ts` | Support early table creation (15min before) vs game start |
| `supabase/functions/paid-tournament-tick/index.ts` | Two-phase: create tables at -15min, start game at start_at |
| `src/pages/PaidTournaments.tsx` | Admin bypasses level gate in `handleRegister` |
| `src/components/poker/PaidTournamentDetail.tsx` | Admin bypass on register button; "Join Table" button for early join; registration countdown |

### NOT Changed
- Bottom navigation
- Styles, layout, spacing
- Any other files

