

## Plan: End Game Button, Flexible Payout Input & Contextual Mini-Bar

### Overview
This plan addresses three key issues:
1. **End Game button** – Allows admins to finalize + complete a tournament from the game page
2. **Flexible payout input** – Let users enter winnings as £ amounts OR % (their choice)
3. **Contextual mini-bar** – Show the active game for the club you're currently viewing, fixing the stale game issue

---

## Part 1: End Game Button

### Problem
Currently there's no prominent "End Game" button. The only way to finalize is through the "Finalize Game & Create Settlements" button in the Payouts tab, which is hidden and requires specific conditions.

### Solution
Add a visible "End Game" button in the game header (next to Settings) that:
- Is only shown to admins
- Opens a confirmation dialog
- Handles different scenarios:
  - **1 player remaining**: Auto-finalize, mark winner, calculate settlements
  - **Multiple players remaining**: Prompt for chop deal or elimination first

### Files to Modify

**File: `src/pages/GameMode.tsx`**

Add an End Game button in the header and a confirmation dialog:

```typescript
// New state
const [endGameDialogOpen, setEndGameDialogOpen] = useState(false);
const [endingGame, setEndingGame] = useState(false);

// End game handler
const handleEndGame = async () => {
  const activePlayers = players.filter(p => p.status === 'active');
  
  if (activePlayers.length === 0) {
    // All players eliminated - just finalize
    await finalizeAndComplete();
  } else if (activePlayers.length === 1) {
    // Mark last player as winner (position 1)
    await markWinnerAndFinalize(activePlayers[0]);
  } else {
    // Multiple players - need to handle (chop or eliminate)
    toast.error(`${activePlayers.length} players still active. Mark eliminations or make a deal first.`);
    return;
  }
};
```

**Header addition:**
```tsx
{isAdmin && session?.status !== 'completed' && (
  <Button
    variant="ghost"
    size="icon"
    onClick={() => setEndGameDialogOpen(true)}
    title="End Game"
  >
    <Flag className="h-5 w-5 text-destructive" />
  </Button>
)}
```

**Confirmation dialog:**
```tsx
<AlertDialog open={endGameDialogOpen} onOpenChange={setEndGameDialogOpen}>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>End Tournament?</AlertDialogTitle>
      <AlertDialogDescription>
        This will finalize the game, calculate settlements, and update the leaderboard.
        {activePlayers.length > 1 && (
          <span className="text-destructive block mt-2">
            {activePlayers.length} players are still active. 
            You must eliminate all but one player or make a chop deal first.
          </span>
        )}
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Cancel</AlertDialogCancel>
      <AlertDialogAction 
        onClick={handleEndGame}
        disabled={activePlayers.length > 1 || endingGame}
        className="bg-destructive"
      >
        {endingGame ? 'Ending...' : 'End Game'}
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

---

## Part 2: Flexible Payout Input (£ or %)

### Problem
The PayoutCalculator only accepts percentage splits. Users want to enter actual currency amounts.

### Solution
Add a toggle to switch between "%" and "£" input modes:
- **% mode** (current): Enter percentages that must sum to 100%
- **£ mode** (new): Enter currency amounts that must sum to prize pool

### Files to Modify

**File: `src/components/game/PayoutCalculator.tsx`**

1. Add input mode state:
```typescript
type InputMode = 'percentage' | 'currency';
const [inputMode, setInputMode] = useState<InputMode>('percentage');
const [currencyPayouts, setCurrencyPayouts] = useState<number[]>([]);

// Initialize currency payouts from percentages
useEffect(() => {
  const amounts = currentPayouts.map(p => Math.round((prizePool * p) / 100));
  setCurrencyPayouts(amounts);
}, [currentPayouts, prizePool]);
```

2. Add mode toggle UI:
```tsx
<div className="flex items-center gap-2 p-2 bg-muted/30 rounded-lg">
  <Label className="text-sm">Input mode:</Label>
  <div className="flex gap-1">
    <Button
      variant={inputMode === 'percentage' ? 'default' : 'outline'}
      size="sm"
      onClick={() => setInputMode('percentage')}
    >
      %
    </Button>
    <Button
      variant={inputMode === 'currency' ? 'default' : 'outline'}
      size="sm"
      onClick={() => setInputMode('currency')}
    >
      {currencySymbol}
    </Button>
  </div>
</div>
```

3. Add currency input fields (in the custom tab):
```tsx
{inputMode === 'currency' && (
  <div className="space-y-3">
    {currencyPayouts.slice(0, paidPositions).map((amount, index) => (
      <div key={index} className="flex items-center gap-2">
        <Label className="w-16 text-sm">{index + 1}{getOrdinalSuffix(index + 1)}</Label>
        <span className="text-muted-foreground">{currencySymbol}</span>
        <Input
          type="number"
          value={amount}
          onChange={(e) => {
            const newAmounts = [...currencyPayouts];
            newAmounts[index] = parseInt(e.target.value) || 0;
            setCurrencyPayouts(newAmounts);
          }}
          className="flex-1"
        />
      </div>
    ))}
    {/* Validation */}
    {currencyTotal !== prizePool && (
      <p className="text-sm text-destructive">
        Total must equal {currencySymbol}{prizePool} (currently {currencySymbol}{currencyTotal})
      </p>
    )}
  </div>
)}
```

4. Update finalization to use the correct payouts:
```typescript
const handleFinalizeGame = async () => {
  const payoutsData = inputMode === 'currency'
    ? currencyPayouts.slice(0, paidPositions).map((amount, index) => ({
        position: index + 1,
        percentage: Math.round((amount / prizePool) * 100),
        amount,
        playerId: finishedPlayers.find(p => p.finish_position === index + 1)?.id || null,
      }))
    : currentPayouts.map((percentage, index) => ({
        position: index + 1,
        percentage,
        amount: calculatePayout(index + 1),
        playerId: finishedPlayers.find(p => p.finish_position === index + 1)?.id || null,
      }));
  
  // ... rest of finalization
};
```

---

## Part 3: Contextual Mini-Bar (Fix Active Game Sync)

### Problem
The mini-bar shows stale game data from `sessionStorage`. When Kuba starts a game, Amir still sees his old cached game.

### Root Cause
The `ActiveGameContext` caches game data in `sessionStorage` and doesn't properly prioritize the correct game based on context.

### Solution
Make the mini-bar context-aware:
1. **On club/event pages**: Show that club's active game
2. **On neutral pages** (Dashboard, Profile): Show most recent active game across all clubs
3. **Force refresh** when navigating between clubs

### Files to Modify

**File: `src/contexts/ActiveGameContext.tsx`**

1. Add context-aware game selection:

```typescript
interface ActiveGameContextType {
  activeGame: ActiveGame | null;
  setActiveGame: (game: ActiveGame | null) => void;
  clearActiveGame: () => void;
  allActiveGames: ActiveGame[]; // NEW: all active games across clubs
  setCurrentClubId: (clubId: string | null) => void; // NEW: context setter
}
```

2. Track all active games, not just one:

```typescript
const [allActiveGames, setAllActiveGames] = useState<ActiveGame[]>([]);
const [currentClubId, setCurrentClubId] = useState<string | null>(null);

// Derive the "active game" based on context
const activeGame = useMemo(() => {
  if (allActiveGames.length === 0) return null;
  
  // If viewing a specific club, prioritize that club's game
  if (currentClubId) {
    const clubGame = allActiveGames.find(async g => {
      const { data } = await supabase
        .from('events')
        .select('club_id')
        .eq('id', g.eventId)
        .single();
      return data?.club_id === currentClubId;
    });
    if (clubGame) return clubGame;
  }
  
  // Otherwise return most recent
  return allActiveGames[0];
}, [allActiveGames, currentClubId]);
```

3. Remove `sessionStorage` dependency for initial load (keep it only for quick restore after page refresh within the same session):

```typescript
// On mount: ALWAYS fetch fresh from DB, don't trust sessionStorage for status
const fetchActiveGames = async () => {
  // Clear any stale cache first
  sessionStorage.removeItem('activeGame');
  
  // Fetch ALL active games for user's clubs
  const { data: activeSessions } = await supabase
    .from('game_sessions')
    .select(`id, event_id, status, ...`)
    .in('status', ['pending', 'active', 'paused'])
    .order('created_at', { ascending: false });
  
  // Filter to user's clubs and build full game data
  // ... fetch all game details
  
  setAllActiveGames(gamesData);
};
```

**File: `src/pages/ClubDetail.tsx`, `src/pages/EventDetail.tsx`, `src/pages/GameMode.tsx`**

Set the current club context when entering these pages:

```typescript
const { setCurrentClubId } = useActiveGame();

useEffect(() => {
  if (clubId) {
    setCurrentClubId(clubId);
  }
  return () => setCurrentClubId(null);
}, [clubId, setCurrentClubId]);
```

**File: `src/components/layout/AppLayout.tsx`**

The mini-bar will automatically show the correct game based on the context set by child pages.

---

## Database Changes

### None required
All changes are frontend-only. The existing `game_sessions` table and RLS policies support this.

---

## Summary of Changes

| File | Change |
|------|--------|
| `src/pages/GameMode.tsx` | Add End Game button + confirmation dialog |
| `src/components/game/PayoutCalculator.tsx` | Add £/% toggle, currency input mode |
| `src/contexts/ActiveGameContext.tsx` | Track all active games, context-aware selection |
| `src/pages/ClubDetail.tsx` | Set current club context |
| `src/pages/EventDetail.tsx` | Set current club context |

---

## User Experience After Implementation

### End Game Button
- Admin sees a **red flag icon** in the game header
- Tapping opens confirmation: "End Tournament?"
- If 1 player left → ends immediately, finalizes settlements
- If multiple players → shows warning, user must eliminate or make a deal first

### Payout Input
- New toggle: **[%] [£]** 
- **% mode**: Enter percentages (50/30/20)
- **£ mode**: Enter amounts (£100/£60/£40)
- Validation ensures totals match 100% or prize pool

### Contextual Mini-Bar
- **In Royal Poles club** → Shows Royal Poles' active game
- **In Pokerstars club** → Shows Pokerstars' active game
- **On Dashboard** → Shows most recent active game
- All club members now see the **same game** for their club

---

## Technical Notes

### End Game Flow
```
Admin taps "End Game"
    ↓
Confirmation dialog
    ↓
Check active players count:
  - 0 players → finalize directly
  - 1 player → mark as winner (pos 1) → finalize
  - 2+ players → error: "Eliminate players or make a deal"
    ↓
finalizeGame() runs:
  - Calculate settlements
  - Update season standings
  - Send notifications
  - Mark session completed
```

### Payout Input Validation
```
% Mode:
  - Sum of percentages must equal 100
  - Amounts auto-calculated from percentages

£ Mode:
  - Sum of amounts must equal prize pool
  - Percentages derived for storage
```

### Mini-Bar Context Logic
```
if (currentClubId) {
  // User is viewing a specific club
  show(activeGames.find(g => g.clubId === currentClubId))
} else {
  // Neutral page (Dashboard, Profile, etc.)
  show(activeGames[0]) // Most recent
}
```

