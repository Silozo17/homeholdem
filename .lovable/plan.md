# Plan: Fix Prize Pool Override, Season Standings, and Completed Game Locking

## ✅ COMPLETED

All four issues have been fixed:

### 1. ✅ Prize Pool Override Now Saved
**File:** `src/components/game/EndGameDialog.tsx`
- Added database update before payout transactions to persist `prize_pool_override`

### 2. ✅ Season Date Lookup Fixed  
**File:** `src/lib/game-finalization.ts`
- Now uses event's `final_date` instead of current date for season attribution
- Games are correctly attributed to seasons even when finalized on a different day

### 3. ✅ Completed Games Now Locked
**Files:** `src/components/game/TournamentClock.tsx`, `src/pages/GameMode.tsx`
- Timer controls hidden for completed games
- "Game Completed" badge shown instead
- Read-only view with limited tabs (players, activity, payouts)
- Settings button still visible but tabs are restricted

### 4. ✅ Jan 2026 Data Fixed
**Database Updates:**
- Set `prize_pool_override = 480` for session `a346a603-8648-4355-967e-4baa8eccf18e`
- Inserted Season 3 standings for all 10 players with correct points

---

## Testing Checklist
- [ ] Navigate to completed Jan 2026 game - timer controls should be hidden
- [ ] Check Season 3 leaderboard - should show all 10 players
- [ ] Game History should show £480 prize pool for Jan 2026
- [ ] Future games: override prize pool and verify it persists
