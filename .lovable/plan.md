

## Plan: Fix Stale Active Game Data (SessionStorage Race Condition)

### Problem Identified
Amir is seeing **stale game data** from his browser's `sessionStorage` instead of the current active game (Kuba's "Styczen 2026" game). 

**Root cause**: The `ActiveGameContext` loads cached game data from `sessionStorage` immediately on mount, then fetches fresh data. However:
1. The cached data might have an outdated status (e.g., the game was completed but the cached status still says "active")
2. The `fetchActiveGames` function has `isInitializedRef.current` check that can cause it to skip refreshing
3. The realtime subscription can have a race condition with the initial sessionStorage load

### Solution
Validate the cached sessionStorage data against the database before using it, and ensure the freshest active game always wins.

---

### Changes Required

#### File: `src/contexts/ActiveGameContext.tsx`

**1. Validate sessionStorage data against the database:**

Instead of blindly trusting the cached status, we should:
- Load from sessionStorage for quick UI render
- Immediately validate against the database
- If the cached session is no longer active, clear it and find the real active game

**2. Fix the prioritization when multiple games exist:**

The current code picks the most recent game by `created_at`, but doesn't handle the case where a user has stale data from a different game.

**3. Always re-fetch on realtime events:**

When a new game is detected via realtime, it should **always** replace the current active game if they're in the same club.

---

### Implementation Details

```typescript
// 1. In fetchActiveGames - validate sessionStorage first
const fetchActiveGames = async () => {
  // Check if there's cached data and validate it
  const stored = sessionStorage.getItem('activeGame');
  let cachedSessionId: string | null = null;
  
  if (stored) {
    try {
      const cached = JSON.parse(stored);
      cachedSessionId = cached.sessionId;
      
      // Validate the cached session is still active
      const { data: validSession } = await supabase
        .from('game_sessions')
        .select('id, status')
        .eq('id', cached.sessionId)
        .single();
      
      if (!validSession || validSession.status === 'completed') {
        // Cached data is stale - clear it
        sessionStorage.removeItem('activeGame');
        setActiveGameState(null);
        cachedSessionId = null;
      }
    } catch (e) {
      sessionStorage.removeItem('activeGame');
    }
  }
  
  // 2. Now fetch fresh active games from user's clubs
  const { data: memberships } = await supabase
    .from('club_members')
    .select('club_id')
    .eq('user_id', user.id);
  
  // ... rest of existing logic
  
  // 3. If we found an active game different from cached, update
  if (freshGameId && freshGameId !== cachedSessionId) {
    await refreshActiveGame(freshGameId, freshEventId);
  }
};
```

**4. Remove the premature sessionStorage load:**

Currently the code loads from sessionStorage BEFORE calling `fetchActiveGames`, which causes the stale data to be displayed. Move this validation inside `fetchActiveGames`.

---

### Summary of Changes

| Location | Change |
|----------|--------|
| Lines 223-236 | Remove the premature sessionStorage load before fetch |
| Lines 133-220 | Add validation step: check if cached session is still active in DB |
| Lines 282-284 | Ensure realtime updates always refresh, regardless of cached data |

---

### Why This Fixes The Issue

1. **Amir's stale sessionStorage** had an old game ID with status "active" (or not "completed")
2. The current code trusted this cached status without validation
3. With the fix:
   - On app load, we immediately validate the cached session against the database
   - If the cached session is completed (or doesn't exist), we clear it
   - We then query for the actual active game in the user's clubs
   - Kuba's game (the real active one) will be found and set as the active game
   - All users in the club will see the same synchronized game

---

### Additional Improvement: Clear Stale Cache on Status Change

When the realtime subscription detects a game completion, ensure **all cached references** to that game are cleared:

```typescript
if (session.status === 'completed') {
  // Clear if this was our active game OR if our cached game is stale
  const stored = sessionStorage.getItem('activeGame');
  if (stored) {
    const cached = JSON.parse(stored);
    if (cached.sessionId === session.id) {
      sessionStorage.removeItem('activeGame');
      setActiveGameState(null);
    }
  }
}
```

