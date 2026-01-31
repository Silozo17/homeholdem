

## Plan: Fix Timer Drift and Add Bulk Buy-In Feature

### Overview
This plan addresses two critical issues:
1. **Timer drift when screen is locked/app backgrounded** - The current `setInterval` approach doesn't work reliably when the device sleeps
2. **Bulk buy-in for all players** - No option to add buy-ins to all players at tournament start

---

## Issue 1: Timer Drift - Root Cause Analysis

### The Problem
The current timer implementation in `TournamentClock.tsx`, `ClassicTimerMode.tsx`, `PortraitTimerMode.tsx`, and other TV modes uses `setInterval` to decrement a counter every second:

```typescript
const interval = setInterval(() => {
  setTimeRemaining(prev => prev - 1);
}, 1000);
```

**Why this fails:**
- When the screen locks or the app goes to background, JavaScript execution is paused/throttled
- `setInterval` doesn't run while suspended
- When the user returns, the timer shows incorrect time (it "paused" while the real clock continued)
- Example: If 5 minutes pass while phone is locked, the timer still shows the old value

### The Solution: Timestamp-Based Timer
Instead of decrementing a counter, calculate time remaining based on:
1. `level_started_at` - When the current level started (stored in DB)
2. `time_remaining_seconds` - The initial time for this level
3. Current time - Calculate elapsed time since level started

**Formula:**
```typescript
const elapsedSeconds = Math.floor((Date.now() - new Date(level_started_at).getTime()) / 1000);
const actualTimeRemaining = Math.max(0, initialTimeRemaining - elapsedSeconds);
```

**Benefits:**
- Works correctly even when app is backgrounded
- When user returns, timer immediately shows correct time
- Uses `level_started_at` timestamp as source of truth (already stored in DB)

---

### Files to Update

#### 1. `src/components/game/TournamentClock.tsx`
- Replace interval-based decrement with timestamp calculation
- On each tick, calculate: `timeRemaining = initialTime - elapsed`
- Handle `visibilitychange` event to recalculate immediately when app returns to foreground
- Only sync to DB when admin pauses (save `time_remaining_seconds` for resume)

```typescript
// NEW: Calculate time from timestamps
const calculateTimeRemaining = useCallback(() => {
  if (!currentLevel) return 0;
  
  if (session.status !== 'active') {
    // When paused, use stored time_remaining_seconds
    return session.time_remaining_seconds || currentLevel.duration_minutes * 60;
  }
  
  if (!session.level_started_at) {
    return currentLevel.duration_minutes * 60;
  }
  
  const startTime = new Date(session.level_started_at).getTime();
  const initialSeconds = session.time_remaining_seconds || currentLevel.duration_minutes * 60;
  const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
  
  return Math.max(0, initialSeconds - elapsedSeconds);
}, [session, currentLevel]);

// Listen for visibility changes (app returns from background)
useEffect(() => {
  const handleVisibilityChange = () => {
    if (document.visibilityState === 'visible' && session.status === 'active') {
      setTimeRemaining(calculateTimeRemaining());
    }
  };
  
  document.addEventListener('visibilitychange', handleVisibilityChange);
  return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
}, [calculateTimeRemaining, session.status]);
```

#### 2. `src/components/game/tv/ClassicTimerMode.tsx`
- Same timestamp-based calculation
- Add `visibilitychange` listener

#### 3. `src/components/game/tv/PortraitTimerMode.tsx`
- Same timestamp-based calculation
- Add `visibilitychange` listener

#### 4. `src/components/game/tv/DashboardMode.tsx`
- Same timestamp-based calculation
- Add `visibilitychange` listener

#### 5. `src/components/game/tv/CombinedMode.tsx`
- Same timestamp-based calculation
- Add `visibilitychange` listener

#### 6. `src/components/game/TournamentMiniBar.tsx`
- Already uses local countdown, but should also use timestamp-based calculation for accuracy

#### 7. Database behavior changes
- When **starting/resuming**: Set `level_started_at` to current timestamp
- When **pausing**: Save current `time_remaining_seconds` (calculated from elapsed time)
- When **advancing level**: Set new `level_started_at`, new `time_remaining_seconds` for new level

---

## Issue 2: Bulk Buy-In for All Players

### The Problem
Currently, admins must click "Add Buy-in" for each player individually. For a 10-player tournament, this requires 10 separate clicks.

### The Solution
Add a "Buy-In All" button that:
1. Identifies all active players WITHOUT a buy-in transaction
2. Creates buy-in transactions for all of them in one batch
3. Shows a confirmation dialog with player count and total amount

---

### Files to Update

#### `src/components/game/BuyInTracker.tsx`

**Add new state and handler:**
```typescript
const [showBulkBuyIn, setShowBulkBuyIn] = useState(false);
const [bulkBuyInPending, setBulkBuyInPending] = useState(false);

// Get players who need buy-in
const playersWithoutBuyIn = activePlayers.filter(player => {
  return !transactions.some(
    t => t.game_player_id === player.id && t.transaction_type === 'buyin'
  );
});

const handleBulkBuyIn = async () => {
  if (!user || playersWithoutBuyIn.length === 0) return;
  
  setBulkBuyInPending(true);
  
  // Create buy-in transactions for all players without one
  const transactionsToInsert = playersWithoutBuyIn.map(player => ({
    game_session_id: session.id,
    game_player_id: player.id,
    transaction_type: 'buyin',
    amount: session.buy_in_amount,
    chips: session.starting_chips,
    created_by: user.id,
  }));
  
  const { error } = await supabase
    .from('game_transactions')
    .insert(transactionsToInsert);
  
  setBulkBuyInPending(false);
  
  if (error) {
    toast.error('Failed to add buy-ins');
    return;
  }
  
  toast.success(`Buy-in added for ${playersWithoutBuyIn.length} players`);
  setShowBulkBuyIn(false);
  onRefresh();
};
```

**Add UI button and confirmation dialog:**
```typescript
{/* Bulk Buy-In Button - shown when there are players without buy-in */}
{isAdmin && playersWithoutBuyIn.length > 0 && (
  <Button
    variant="default"
    size="sm"
    onClick={() => setShowBulkBuyIn(true)}
    className="glow-gold"
  >
    <Users className="h-4 w-4 mr-1" />
    Buy-In All ({playersWithoutBuyIn.length})
  </Button>
)}

{/* Bulk Buy-In Confirmation Dialog */}
<Dialog open={showBulkBuyIn} onOpenChange={setShowBulkBuyIn}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Buy-In All Players</DialogTitle>
    </DialogHeader>
    <div className="py-4 space-y-4">
      <p className="text-muted-foreground">
        Add buy-in for <span className="font-bold text-foreground">{playersWithoutBuyIn.length} players</span>?
      </p>
      <div className="bg-primary/10 rounded-lg p-4 space-y-2">
        <div className="flex justify-between">
          <span>Buy-in per player:</span>
          <span className="font-bold">{currencySymbol}{session.buy_in_amount}</span>
        </div>
        <div className="flex justify-between">
          <span>Chips per player:</span>
          <span className="font-bold">{session.starting_chips.toLocaleString()}</span>
        </div>
        <div className="border-t border-border/30 pt-2 flex justify-between">
          <span className="font-bold">Total:</span>
          <span className="font-bold text-primary">
            {currencySymbol}{session.buy_in_amount * playersWithoutBuyIn.length}
          </span>
        </div>
      </div>
      <div className="text-sm text-muted-foreground">
        Players to buy-in:
        <div className="flex flex-wrap gap-1 mt-1">
          {playersWithoutBuyIn.map(p => (
            <Badge key={p.id} variant="secondary">{p.display_name}</Badge>
          ))}
        </div>
      </div>
    </div>
    <DialogFooter>
      <Button variant="outline" onClick={() => setShowBulkBuyIn(false)}>
        Cancel
      </Button>
      <Button 
        onClick={handleBulkBuyIn} 
        disabled={bulkBuyInPending}
        className="glow-gold"
      >
        {bulkBuyInPending ? 'Processing...' : `Buy-In ${playersWithoutBuyIn.length} Players`}
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

---

## Summary of Changes

| File | Change |
|------|--------|
| `src/components/game/TournamentClock.tsx` | Replace interval decrement with timestamp calculation, add visibility listener |
| `src/components/game/tv/ClassicTimerMode.tsx` | Same timestamp-based timer fix |
| `src/components/game/tv/PortraitTimerMode.tsx` | Same timestamp-based timer fix |
| `src/components/game/tv/DashboardMode.tsx` | Same timestamp-based timer fix |
| `src/components/game/tv/CombinedMode.tsx` | Same timestamp-based timer fix |
| `src/components/game/TournamentMiniBar.tsx` | Timestamp-based calculation for accuracy |
| `src/components/game/BuyInTracker.tsx` | Add "Buy-In All" button with confirmation dialog |

---

## Technical Details

### Timer Calculation Logic
```typescript
// When game is ACTIVE:
// 1. level_started_at = timestamp when timer started/resumed
// 2. time_remaining_seconds = initial time when level started
// 3. actualRemaining = time_remaining_seconds - elapsed since level_started_at

// When game is PAUSED:
// 1. time_remaining_seconds = saved remaining time at pause moment
// 2. Display this directly (no calculation needed)

// When RESUMING:
// 1. Update level_started_at to NOW
// 2. Keep time_remaining_seconds as the starting point
```

### Handling Level Advancement
When a level ends automatically:
1. Set `current_level` to next level
2. Set `level_started_at` to current timestamp
3. Set `time_remaining_seconds` to new level's duration

---

## User Experience After Fix

1. **Timer accuracy**: Timer will show correct time even after:
   - Locking phone screen
   - Switching to another app
   - Minimizing browser
   - Phone going to sleep

2. **Bulk buy-in**: At tournament start, admin can:
   - Tap "Buy-In All" button
   - See confirmation with player list and total amount
   - One tap to add buy-ins for everyone

