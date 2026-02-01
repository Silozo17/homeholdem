
# Plan: Fix Prize Pool Override, Season Standings, and Completed Game Locking

## Summary of Issues Found

Based on my investigation, I've identified **four distinct bugs**:

### 1. Prize Pool Override Not Being Saved
**Root Cause:** The `EndGameDialog.tsx` allows admin to check "Override prize pool" and enter a custom value (e.g., £480), but this value is **never saved to the database**. The `prize_pool_override` column in `game_sessions` remains `null`.

**Database Evidence:**
- Styczen 2026 session has `prize_pool_override: null`
- But payout transactions total to £480 (stored as -480)
- Buy-ins only total £360

### 2. Season 3 Shows No Standings Despite Jan 2026 Being Completed
**Root Cause:** The `game-finalization.ts` uses `today` (current date: Feb 1, 2026) to find the season, but the game was finalized on **Jan 31, 2026**. The season lookup query:
```typescript
const today = new Date().toISOString().split('T')[0]; // This is WRONG
```
Should use the **event date** instead of `today` because finalization might happen on a different day than the game.

**Additional Issue:** Season 3 runs Jan 1 - Dec 31 2026. The Jan 31 event falls within this range, so standings should be there. This suggests the season lookup failed during finalization.

### 3. Timer Controls Should Be Disabled for Completed Games
**Current State:** When a game is completed (`status: 'completed'`), users can still access GameMode and see the timer/controls. While the "End Game" button is correctly hidden, the timer controls (play/pause, prev/next level) are still visible to admins.

**Required Behavior:**
- Completed games should show read-only results (timer frozen, no controls)
- Only club owner can make edits to historical data
- Non-admins should see results only (no edit capability)

### 4. Data Fix Needed for Jan 2026 Event
The prize_pool_override for session `a346a603-8648-4355-967e-4baa8eccf18e` needs to be set to £480, and season standings need to be populated for Season 3.

---

## Technical Solution

### Part A: Save Prize Pool Override in EndGameDialog

**File:** `src/components/game/EndGameDialog.tsx`

Add database update to save `prize_pool_override` before calling `finalizeGame`:

```typescript
// Before finalizing, save the prize pool override if set
if (overridePrizePool && customPrizePool !== calculatedPrizePool) {
  await supabase
    .from('game_sessions')
    .update({ prize_pool_override: customPrizePool })
    .eq('id', sessionId);
}
```

This should be inserted around line 378, before the payout transactions are recorded.

---

### Part B: Fix Season Date Lookup in game-finalization.ts

**File:** `src/lib/game-finalization.ts`

**Problem:** Uses `today` instead of the actual game date.

**Solution:** Get the event's `final_date` and use that for season lookup.

```typescript
// Current (WRONG):
const today = new Date().toISOString().split('T')[0];

// Fixed:
// Get the event's final_date for accurate season attribution
const { data: eventData } = await supabase
  .from('events')
  .select('final_date')
  .eq('id', sessionData.event_id)
  .single();

const gameDate = eventData?.final_date 
  ? new Date(eventData.final_date).toISOString().split('T')[0]
  : new Date().toISOString().split('T')[0]; // Fallback to today

// Then use gameDate instead of today in the season query
```

Update the season query to use `gameDate`:
```typescript
const { data: activeSeason } = await supabase
  .from('seasons')
  .select('*')
  .eq('club_id', clubId)
  .lte('start_date', gameDate)
  .gte('end_date', gameDate)
  .single();
```

---

### Part C: Lock Timer for Completed Games

**File:** `src/components/game/TournamentClock.tsx`

**Change:** Disable all controls when session status is 'completed':

```typescript
// Add check for completed status
const isCompleted = session.status === 'completed';

// In the controls section (around line 329):
{isAdmin && !tvMode && !isCompleted && (
  <div className="flex items-center justify-center gap-2">
    {/* existing controls */}
  </div>
)}

// For completed games, show a "Game Completed" badge instead
{isCompleted && !tvMode && (
  <div className="flex justify-center">
    <Badge variant="default" className="text-sm">
      Game Completed
    </Badge>
  </div>
)}
```

**File:** `src/pages/GameMode.tsx`

**Changes:**
1. Hide "Start Tournament" button if game is already completed
2. Disable settings changes for completed games (except for club owner)
3. Show results-only view for completed sessions

```typescript
// Around line 237, check for completed status
{!session ? (
  // Start tournament UI
) : session.status === 'completed' ? (
  // Show completed game summary - read only
  <CompletedGameView ... />
) : (
  // Active game UI with controls
)}
```

---

### Part D: Database Corrections (One-Time Fix)

**1. Fix Jan 2026 Prize Pool Override:**
```sql
UPDATE game_sessions 
SET prize_pool_override = 480
WHERE id = 'a346a603-8648-4355-967e-4baa8eccf18e';
```

**2. Populate Season 3 Standings:**
Run a script to recalculate standings for games played within Season 3's date range. This involves:
- Finding all completed game_sessions for events with final_date between 2026-01-01 and 2026-12-31
- For each, calculate player points and insert into season_standings

---

## Files to Modify

| File | Change Description |
|------|---------------------|
| `src/components/game/EndGameDialog.tsx` | Save `prize_pool_override` to database when admin overrides |
| `src/lib/game-finalization.ts` | Use event's `final_date` for season lookup instead of current date |
| `src/components/game/TournamentClock.tsx` | Disable controls when game is completed |
| `src/pages/GameMode.tsx` | Show read-only view for completed games, hide start button if completed |
| Database | One-time update to fix Jan 2026 prize pool and regenerate Season 3 standings |

---

## Implementation Order

1. **Fix EndGameDialog** - Save prize_pool_override (prevents future issues)
2. **Fix game-finalization.ts** - Correct season attribution logic
3. **Lock completed games** - Add read-only mode for TournamentClock and GameMode
4. **Database corrections** - Fix Jan 2026 data and regenerate Season 3 standings

---

## Testing Recommendations

After implementation:
1. Create a test game, override the prize pool to a different value, end the game
2. Verify the `prize_pool_override` is saved in the database
3. Check that Game History shows the overridden value
4. Verify Season 3 standings now show the Jan 2026 game results
5. Navigate to a completed game and verify:
   - Timer controls are disabled
   - Settings are read-only (except for owner)
   - Results are displayed properly
   - "Start Tournament" button is not shown
