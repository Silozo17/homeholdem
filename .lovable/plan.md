

## Plan: Fix End Game Dialog Winner Assignment with Player Dropdown Selectors

### Problems Identified

Based on the screenshot and code analysis:

**Problem 1: Wrong Winner Detection**
The `getPlayerForPosition()` function uses flawed logic:
```typescript
// Current buggy code - just picks from array in reverse order
if (activePlayers.length > 0 && index < activePlayers.length) {
  return activePlayers[activePlayers.length - 1 - index]?.display_name;
}
```
This randomly assigns active players to positions based on array order, not actual performance.

**Problem 2: No Manual Winner Selection**
When 10 players are still active (as shown in your screenshot), admins cannot manually select who finished 1st, 2nd, etc. The current UI just shows auto-detected names with no way to change them.

---

## Solution Overview

Transform the payout structure section to include **dropdown selectors** for each prize position, allowing admins to:

1. See all players in a dropdown menu for each position
2. Manually select who gets 1st, 2nd, 3rd, etc.
3. Prevent the same player from being selected for multiple positions
4. Default to "Not assigned" when there are many active players

---

## UI Design (Updated)

```
┌─────────────────────────────────────────────────┐
│  Payout Structure                               │
│                                                 │
│  🏆 1st Place                                   │
│  ┌─────────────────────────┐  £ ┌──────┐       │
│  │ Select winner...      ▼ │    │ 312  │       │
│  └─────────────────────────┘    └──────┘       │
│    ├─ Damian C                                  │
│    ├─ Borys                                     │
│    ├─ John                                      │
│    └─ (all 10 active players)                   │
│                                                 │
│  🥈 2nd Place                                   │
│  ┌─────────────────────────┐  £ ┌──────┐       │
│  │ Select player...      ▼ │    │ 168  │       │
│  └─────────────────────────┘    └──────┘       │
│                                                 │
│  Total: £480 ✓                                  │
│                                                 │
│  ⚠️ 8 remaining players will be auto-assigned  │
│     positions 3–10                              │
│                                                 │
│         [Cancel]  [End Tournament]              │
└─────────────────────────────────────────────────┘
```

---

## Technical Implementation

### File: `src/components/game/EndGameDialog.tsx`

**Key Changes:**

1. **Add state for selected players per position:**
```typescript
// Track which player is selected for each prize position
const [selectedPlayers, setSelectedPlayers] = useState<(string | null)[]>(
  [null, null, null, null, null]
);
```

2. **Get available players for each position dropdown:**
```typescript
// All players (both active and eliminated) can be selected as winners
const allPlayers = useMemo(() => {
  return players.map(p => ({
    id: p.id,
    name: p.display_name,
    status: p.status,
    finishPosition: p.finish_position
  }));
}, [players]);

// Filter out already-selected players from other positions
const getAvailablePlayersForPosition = (positionIndex: number) => {
  const selectedAtOtherPositions = selectedPlayers
    .filter((_, i) => i !== positionIndex)
    .filter(Boolean);
  
  return allPlayers.filter(p => !selectedAtOtherPositions.includes(p.id));
};
```

3. **Replace text display with Select dropdown:**
```tsx
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// In the payout row:
<Select
  value={selectedPlayers[index] || ''}
  onValueChange={(value) => handlePlayerSelection(index, value)}
>
  <SelectTrigger className="w-40">
    <SelectValue placeholder={t('game.select_player')} />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="">
      <span className="text-muted-foreground">{t('game.not_assigned')}</span>
    </SelectItem>
    {getAvailablePlayersForPosition(index).map((player) => (
      <SelectItem key={player.id} value={player.id}>
        {player.name}
        {player.status === 'eliminated' && (
          <span className="text-muted-foreground text-xs ml-1">
            (#{player.finishPosition})
          </span>
        )}
      </SelectItem>
    ))}
  </SelectContent>
</Select>
```

4. **Handle player selection:**
```typescript
const handlePlayerSelection = (positionIndex: number, playerId: string) => {
  setSelectedPlayers(prev => {
    const updated = [...prev];
    updated[positionIndex] = playerId || null;
    return updated;
  });
};
```

5. **Smart default selection based on elimination order:**
```typescript
useEffect(() => {
  if (open) {
    // Pre-select players based on elimination order (if any)
    const eliminatedByPosition = players
      .filter(p => p.finish_position !== null)
      .sort((a, b) => (a.finish_position || 999) - (b.finish_position || 999));
    
    const defaultSelections = Array(5).fill(null);
    eliminatedByPosition.slice(0, 5).forEach((player, i) => {
      defaultSelections[i] = player.id;
    });
    
    // If only 1 active player remains, auto-select as winner
    if (activePlayers.length === 1) {
      defaultSelections[0] = activePlayers[0].id;
    }
    
    setSelectedPlayers(defaultSelections);
  }
}, [open, players]);
```

6. **Update handleEndGame to use selected players:**
```typescript
const handleEndGame = async () => {
  // Validate that all paid positions have players selected
  for (let i = 0; i < paidPositions; i++) {
    if (!selectedPlayers[i]) {
      toast.error(t('game.select_all_winners', { position: getPositionLabel(i) }));
      return;
    }
  }
  
  // Build payouts using selected players
  const payouts = [];
  for (let i = 0; i < paidPositions; i++) {
    const playerId = selectedPlayers[i];
    const player = players.find(p => p.id === playerId);
    
    payouts.push({
      position: i + 1,
      percentage: /* ... */,
      amount: /* ... */,
      playerId: playerId,
    });
  }
  
  // Assign finish positions to selected players
  for (let i = 0; i < paidPositions; i++) {
    const playerId = selectedPlayers[i];
    await supabase
      .from('game_players')
      .update({
        status: 'eliminated',
        finish_position: i + 1,
        eliminated_at: new Date().toISOString(),
      })
      .eq('id', playerId);
  }
  
  // Auto-assign remaining active players positions after paid positions
  const remainingActive = activePlayers.filter(
    p => !selectedPlayers.slice(0, paidPositions).includes(p.id)
  );
  
  for (let i = 0; i < remainingActive.length; i++) {
    await supabase
      .from('game_players')
      .update({
        status: 'eliminated',
        finish_position: paidPositions + i + 1,
        eliminated_at: new Date().toISOString(),
      })
      .eq('id', remainingActive[i].id);
  }
  
  // Continue with finalization...
};
```

7. **Update the warning message to be more accurate:**
```tsx
{remainingActivePlayers.length > 0 && (
  <div className="flex items-start gap-2 text-amber-500 bg-amber-500/10 rounded-lg p-3">
    <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
    <span className="text-sm">
      {t('game.remaining_players_note', { 
        count: remainingActivePlayers.length,
        startPos: paidPositions + 1,
        endPos: paidPositions + remainingActivePlayers.length
      })}
    </span>
  </div>
)}
```

---

### Translation Updates

**English (`src/i18n/locales/en.json`):**
```json
{
  "game": {
    "select_player": "Select player...",
    "not_assigned": "Not assigned",
    "select_all_winners": "Please select a player for {{position}}",
    "remaining_players_note": "{{count}} remaining players will be assigned positions {{startPos}}–{{endPos}}"
  }
}
```

**Polish (`src/i18n/locales/pl.json`):**
```json
{
  "game": {
    "select_player": "Wybierz gracza...",
    "not_assigned": "Nie przypisano",
    "select_all_winners": "Wybierz gracza dla pozycji {{position}}",
    "remaining_players_note": "{{count}} pozostałych graczy otrzyma pozycje {{startPos}}–{{endPos}}"
  }
}
```

---

## Summary of Changes

| File | Change |
|------|--------|
| `src/components/game/EndGameDialog.tsx` | Add player selection dropdowns for each prize position; fix auto-assignment logic; add validation |
| `src/i18n/locales/en.json` | Add new translation keys for player selection |
| `src/i18n/locales/pl.json` | Add Polish translations |

---

## User Experience After Implementation

### Scenario: 10 Active Players (No One Eliminated)
1. Click End Game
2. See dropdown selectors for 1st, 2nd, etc. - all empty by default
3. **Manually select** the winner from dropdown showing all 10 players
4. Select 2nd place from remaining 9 players
5. Warning shows: "8 remaining players will be assigned positions 3–10"
6. Click End Tournament → Winners correctly recorded

### Scenario: Some Players Already Eliminated  
1. Click End Game
2. Dropdowns pre-filled with eliminated players by their finish order
3. Can override selections if needed
4. Click End Tournament → Payouts match selected players

### Scenario: 1 Active Player Remaining
1. Click End Game
2. Winner dropdown auto-selected with the last active player
3. 2nd/3rd pre-filled from elimination order
4. Click End Tournament → Clean finish

---

## Validation Rules

1. **All paid positions must have a player selected** before "End Game" can proceed
2. **Same player cannot be selected for multiple positions** (dropdown filters out already-selected players)
3. **Prize pool validation** still applies (totals must match)

