

## Plan: Global Tournament Synchronization for All Club Members

### Overview
The current implementation only shows the tournament mini bar for the user who navigated to the game page and has the active game stored in their local context. This plan implements a **global synchronized tournament system** where ALL club members (players AND spectators) see the live tournament mini bar when any game is in progress.

---

### Current Problem Analysis

**How it works now:**
1. User A (admin) goes to `/event/{eventId}/game` and starts the tournament
2. The `GameMode.tsx` page calls `setActiveGame()` which stores the game in:
   - Local React state (`ActiveGameContext`)
   - Browser `sessionStorage` (persists across page navigation within same tab)
3. User B (club member/spectator) **never navigates** to the game page
4. User B's `ActiveGameContext` is empty → no mini bar appears

**The fundamental issue:** 
The active game state is **per-device/per-session**, not **per-club**. There's no mechanism to:
1. Detect active games for clubs the user belongs to
2. Push this state to all club members automatically

---

### Solution Architecture

Implement a **club-wide active game detection system** that:
1. On app load, queries for any active game sessions in the user's clubs
2. Subscribes to real-time updates for these game sessions
3. Automatically populates the `ActiveGameContext` for all club members
4. Shows the synchronized mini bar to everyone

---

### Implementation Steps

#### Part 1: Modify ActiveGameContext to Auto-Detect Active Games

**File: `src/contexts/ActiveGameContext.tsx`**

Add logic to automatically fetch and subscribe to active games across all clubs the user belongs to:

```typescript
// On mount or user login:
useEffect(() => {
  if (!user) return;
  
  const fetchActiveGames = async () => {
    // 1. Get all clubs the user is a member of
    const { data: memberships } = await supabase
      .from('club_members')
      .select('club_id')
      .eq('user_id', user.id);
    
    if (!memberships || memberships.length === 0) return;
    
    const clubIds = memberships.map(m => m.club_id);
    
    // 2. Find active game sessions in any of these clubs
    const { data: activeSessions } = await supabase
      .from('game_sessions')
      .select(`
        id,
        event_id,
        status,
        current_level,
        time_remaining_seconds,
        level_started_at,
        events!inner (
          id,
          club_id
        )
      `)
      .in('events.club_id', clubIds)
      .in('status', ['pending', 'active', 'paused'])
      .order('created_at', { ascending: false })
      .limit(1);
    
    if (activeSessions && activeSessions.length > 0) {
      const session = activeSessions[0];
      
      // 3. Fetch blind structure for this session
      const { data: blinds } = await supabase
        .from('blind_structures')
        .select('*')
        .eq('game_session_id', session.id)
        .order('level');
      
      // 4. Get player count and prize pool
      const { data: players } = await supabase
        .from('game_players')
        .select('id, status')
        .eq('game_session_id', session.id);
      
      const { data: transactions } = await supabase
        .from('game_transactions')
        .select('amount, transaction_type')
        .eq('game_session_id', session.id);
      
      // 5. Get currency from club
      const { data: clubData } = await supabase
        .from('clubs')
        .select('currency')
        .eq('id', session.events.club_id)
        .single();
      
      const activePlayers = players?.filter(p => p.status === 'active').length || 0;
      const prizePool = transactions
        ?.filter(t => ['buyin', 'rebuy', 'addon'].includes(t.transaction_type))
        .reduce((sum, t) => sum + t.amount, 0) || 0;
      
      setActiveGame({
        sessionId: session.id,
        eventId: session.event_id,
        status: session.status,
        currentLevel: session.current_level,
        timeRemainingSeconds: session.time_remaining_seconds,
        levelStartedAt: session.level_started_at,
        blindStructure: blinds || [],
        prizePool,
        playersRemaining: activePlayers,
        currencySymbol: CURRENCY_SYMBOLS[clubData?.currency || 'GBP'] || '£',
      });
    }
  };
  
  fetchActiveGames();
}, [user]);
```

#### Part 2: Subscribe to Club-Wide Game Session Changes

Add a realtime subscription that listens for **any game session changes** in the user's clubs:

```typescript
// Subscribe to game_sessions changes for user's clubs
useEffect(() => {
  if (!user) return;
  
  // Subscribe to ALL game_session changes (we'll filter client-side)
  const channel = supabase
    .channel('global-game-sessions')
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'game_sessions',
    }, async (payload) => {
      if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
        const session = payload.new as any;
        
        // Check if this session is in one of user's clubs
        const { data: eventData } = await supabase
          .from('events')
          .select('club_id')
          .eq('id', session.event_id)
          .single();
        
        if (!eventData) return;
        
        // Check if user is a member of this club
        const { data: membership } = await supabase
          .from('club_members')
          .select('id')
          .eq('club_id', eventData.club_id)
          .eq('user_id', user.id)
          .single();
        
        if (!membership) return; // Not a member, ignore
        
        // Handle based on status
        if (session.status === 'completed') {
          // Game ended - clear if this was our active game
          setActiveGameState(prev => 
            prev?.sessionId === session.id ? null : prev
          );
          sessionStorage.removeItem('activeGame');
        } else if (['pending', 'active', 'paused'].includes(session.status)) {
          // Game started or updated - fetch full data and set
          await refreshActiveGame(session.id, session.event_id);
        }
      }
    })
    .subscribe();
  
  return () => {
    supabase.removeChannel(channel);
  };
}, [user]);
```

#### Part 3: Add Helper Function to Refresh Active Game Data

```typescript
const refreshActiveGame = useCallback(async (sessionId: string, eventId: string) => {
  // Fetch all required data for the mini bar
  const { data: session } = await supabase
    .from('game_sessions')
    .select('*')
    .eq('id', sessionId)
    .single();
  
  if (!session) return;
  
  const { data: blinds } = await supabase
    .from('blind_structures')
    .select('*')
    .eq('game_session_id', sessionId)
    .order('level');
  
  const { data: players } = await supabase
    .from('game_players')
    .select('id, status')
    .eq('game_session_id', sessionId);
  
  const { data: transactions } = await supabase
    .from('game_transactions')
    .select('amount, transaction_type')
    .eq('game_session_id', sessionId);
  
  const { data: eventData } = await supabase
    .from('events')
    .select('club_id')
    .eq('id', eventId)
    .single();
  
  const { data: clubData } = await supabase
    .from('clubs')
    .select('currency')
    .eq('id', eventData?.club_id)
    .single();
  
  const activePlayers = players?.filter(p => p.status === 'active').length || 0;
  const prizePool = transactions
    ?.filter(t => ['buyin', 'rebuy', 'addon'].includes(t.transaction_type))
    .reduce((sum, t) => sum + t.amount, 0) || 0;
  
  const currencySymbols: Record<string, string> = {
    'GBP': '£', 'USD': '$', 'EUR': '€', 'PLN': 'zł',
  };
  
  const gameData = {
    sessionId,
    eventId,
    status: session.status,
    currentLevel: session.current_level,
    timeRemainingSeconds: session.time_remaining_seconds,
    levelStartedAt: session.level_started_at,
    blindStructure: blinds || [],
    prizePool,
    playersRemaining: activePlayers,
    currencySymbol: currencySymbols[clubData?.currency || 'GBP'] || '£',
  };
  
  setActiveGameState(gameData);
  sessionStorage.setItem('activeGame', JSON.stringify(gameData));
}, []);
```

#### Part 4: Subscribe to Player/Transaction Updates for Prize Pool Sync

Add additional subscriptions to keep the prize pool and player count synchronized:

```typescript
// When we have an active game, subscribe to its players and transactions
useEffect(() => {
  if (!activeGame) return;
  
  const channel = supabase
    .channel(`game-updates-${activeGame.sessionId}`)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'game_players',
      filter: `game_session_id=eq.${activeGame.sessionId}`,
    }, async () => {
      // Refetch player count
      const { data: players } = await supabase
        .from('game_players')
        .select('id, status')
        .eq('game_session_id', activeGame.sessionId);
      
      const activePlayers = players?.filter(p => p.status === 'active').length || 0;
      
      setActiveGameState(prev => prev ? {
        ...prev,
        playersRemaining: activePlayers,
      } : null);
    })
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'game_transactions',
      filter: `game_session_id=eq.${activeGame.sessionId}`,
    }, async () => {
      // Refetch prize pool
      const { data: transactions } = await supabase
        .from('game_transactions')
        .select('amount, transaction_type')
        .eq('game_session_id', activeGame.sessionId);
      
      const prizePool = transactions
        ?.filter(t => ['buyin', 'rebuy', 'addon'].includes(t.transaction_type))
        .reduce((sum, t) => sum + t.amount, 0) || 0;
      
      setActiveGameState(prev => prev ? {
        ...prev,
        prizePool,
      } : null);
    })
    .subscribe();
  
  return () => {
    supabase.removeChannel(channel);
  };
}, [activeGame?.sessionId]);
```

#### Part 5: Update GameMode.tsx to Not Duplicate Logic

The `GameMode.tsx` still updates the context when on the game page. This is fine and will work alongside the global detection. The global detection ensures the mini bar shows even when the user hasn't visited the game page.

**File: `src/pages/GameMode.tsx`**

No major changes needed - the existing `setActiveGame` call will continue to work. However, we can add a minor optimization to avoid duplicate subscriptions:

```typescript
// The existing useEffect that updates activeGame is fine
// The global subscription in ActiveGameContext will handle sync for other users
```

---

### Summary of Changes

| File | Change |
|------|--------|
| `src/contexts/ActiveGameContext.tsx` | Add auto-detection of active games on mount, global realtime subscription, player/transaction sync |

---

### How It Works After Implementation

1. **User A (Admin)** starts a tournament on `/event/{eventId}/game`
2. The `game_sessions` table gets a new row with status `'pending'` or `'active'`
3. **All club members** have the `ActiveGameContext` subscribed to `game_sessions` changes
4. The realtime event triggers for **all club members**
5. Each member's app checks if they're in the same club and fetches the game data
6. The `TournamentMiniBar` appears for **everyone** - synchronized!

**Timer Sync:**
- The mini bar uses the timestamp-based calculation (already implemented)
- All users calculate time from the same `level_started_at` and `time_remaining_seconds`
- Result: Perfectly synchronized timers across all devices

**Spectator Support:**
- Spectators don't need to be on the game page
- The mini bar links to `/event/{eventId}/game` so they can tap to view
- On the game page, they see the full tournament but can't control it (non-admin)

---

### Edge Cases Handled

1. **Multiple clubs with active games**: The system picks the most recent one. In practice, users rarely have overlapping tournaments.

2. **User joins mid-tournament**: On app load, the `fetchActiveGames` query finds the in-progress game.

3. **Game completes**: The realtime subscription detects `status = 'completed'` and clears the mini bar.

4. **Network reconnection**: Supabase realtime automatically reconnects. The `sessionStorage` fallback shows the last known state until sync.

5. **User is not a club member**: The membership check prevents showing games from clubs the user doesn't belong to.

