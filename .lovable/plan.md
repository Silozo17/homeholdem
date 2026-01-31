

## Plan: Enhanced End Game Dialog with Payout & Prize Pool Override

### Problem Summary

When a user clicks the **End Game** button (red flag icon), the current dialog is very basic:
1. It uses fixed default payout percentages (50/30/20 or 65/35, etc.)
2. **No way to enter custom winner amounts or percentages**
3. **No way to override the prize pool** if transactions were forgotten during the game

This forces users to manually track missed buy-ins or go back to add them before ending, which is inconvenient.

---

## Solution Overview

Transform the simple `EndGameDialog` into a comprehensive **End Game Wizard** that allows:

1. **Override the Prize Pool** - manually adjust the total if buy-ins/add-ons were missed
2. **Set Winner Payouts** - enter amounts as either percentages OR currency values
3. **Choose Paid Positions** - 1 to 5 positions, with preset or custom splits
4. **Validation** - ensure payouts equal the (potentially adjusted) prize pool

---

## Current vs Proposed Flow

### Current Flow
```
Click End Game → Simple confirm dialog → Auto-calculates 50/30/20 → Done
```

### Proposed Flow
```
Click End Game → Enhanced dialog with:
  ├── Prize Pool Override (optional adjustment)
  ├── Paid Positions Selector (1-5)
  ├── Input Mode Toggle (% or £)
  ├── Payout Editor (per position)
  ├── Winner Assignment (auto-detected from finish positions)
  └── Finalize Button (with validation)
```

---

## UI Design

```
┌─────────────────────────────────────────────────┐
│  🏁 End Tournament                              │
├─────────────────────────────────────────────────┤
│                                                 │
│  Prize Pool                                     │
│  ┌──────────────────────────────────────────┐  │
│  │ Calculated: £300                         │  │
│  │ ☐ Override prize pool                    │  │
│  │   ┌─────────────────┐                    │  │
│  │   │ £ [ 320        ]│ (if checkbox on)   │  │
│  │   └─────────────────┘                    │  │
│  └──────────────────────────────────────────┘  │
│                                                 │
│  Paid Positions:  [1] [2] [3●] [4] [5]         │
│                                                 │
│  Input Mode:  [%●] [£]                         │
│                                                 │
│  Payouts:                                       │
│  ┌──────────────────────────────────────────┐  │
│  │  🥇 1st (John):    [50]% = £160          │  │
│  │  🥈 2nd (Sarah):   [30]% = £96           │  │
│  │  🥉 3rd (Mike):    [20]% = £64           │  │
│  │                    ─────────             │  │
│  │  Total:            100% = £320  ✓        │  │
│  └──────────────────────────────────────────┘  │
│                                                 │
│  ⚠️ 2 players still active. Finish positions   │
│     will be auto-assigned.                      │
│                                                 │
│         [Cancel]  [End Tournament]              │
└─────────────────────────────────────────────────┘
```

---

## Technical Implementation

### File: `src/components/game/EndGameDialog.tsx`

**Major Changes:**

1. **Add prize pool override state:**
```tsx
const [overridePrizePool, setOverridePrizePool] = useState(false);
const [customPrizePool, setCustomPrizePool] = useState(calculatedPrizePool);

const effectivePrizePool = overridePrizePool ? customPrizePool : calculatedPrizePool;
```

2. **Add payout configuration state:**
```tsx
const [paidPositions, setPaidPositions] = useState(3);
const [inputMode, setInputMode] = useState<'percentage' | 'currency'>('percentage');
const [customPayouts, setCustomPayouts] = useState([50, 30, 20]);
const [currencyPayouts, setCurrencyPayouts] = useState<number[]>([]);
```

3. **Add validation logic:**
```tsx
const totalPercentage = customPayouts.slice(0, paidPositions).reduce((a, b) => a + b, 0);
const isValidPercentage = totalPercentage === 100;

const currencyTotal = currencyPayouts.slice(0, paidPositions).reduce((a, b) => a + b, 0);
const isCurrencyValid = currencyTotal === effectivePrizePool;

const canFinalize = inputMode === 'percentage' ? isValidPercentage : isCurrencyValid;
```

4. **Update handleEndGame to use custom payouts:**
```tsx
const payouts = inputMode === 'currency'
  ? currencyPayouts.slice(0, paidPositions).map((amount, i) => ({
      position: i + 1,
      percentage: Math.round((amount / effectivePrizePool) * 100),
      amount,
      playerId: finishedPlayers[i]?.id || null,
    }))
  : customPayouts.slice(0, paidPositions).map((pct, i) => ({
      position: i + 1,
      percentage: pct,
      amount: Math.round((effectivePrizePool * pct) / 100),
      playerId: finishedPlayers[i]?.id || null,
    }));
```

5. **Auto-assign remaining players on end:**
```tsx
// If there are active players, assign finish positions automatically
// Winner gets position 1, others get next available positions
if (activePlayers.length > 0) {
  const highestPosition = Math.max(
    ...players.filter(p => p.finish_position).map(p => p.finish_position || 0),
    0
  );
  
  for (let i = 0; i < activePlayers.length; i++) {
    const position = activePlayers.length === 1 ? 1 : highestPosition + 1 + i;
    // ... update player finish position
  }
}
```

---

### New Props Required

```tsx
interface EndGameDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionId: string;
  eventId: string;
  clubId: string;
  players: GamePlayer[];
  transactions: Transaction[];
  onComplete: () => void;
  currencySymbol: string;  // NEW: for displaying currency
}
```

---

### File: `src/pages/GameMode.tsx`

Pass `currencySymbol` to EndGameDialog:

```tsx
<EndGameDialog
  open={endGameDialogOpen}
  onOpenChange={setEndGameDialogOpen}
  sessionId={session.id}
  eventId={eventId || ''}
  clubId={clubId || ''}
  players={players}
  transactions={transactions}
  onComplete={refetch}
  currencySymbol={currencySymbol}  // NEW
/>
```

---

### Translation Keys

**English (`src/i18n/locales/en.json`):**
```json
{
  "game": {
    "calculated_prize_pool": "Calculated Prize Pool",
    "override_prize_pool": "Override prize pool",
    "prize_pool_override_hint": "Adjust if buy-ins or add-ons were missed during the game",
    "paid_positions": "Paid Positions",
    "payout_structure": "Payout Structure",
    "will_receive": "will receive",
    "no_player_assigned": "Not assigned yet",
    "auto_assign_note": "{{count}} active players will be auto-assigned finish positions",
    "total_payout": "Total Payout",
    "payout_valid": "Payouts match prize pool",
    "payout_invalid": "Payouts must equal prize pool"
  }
}
```

**Polish (`src/i18n/locales/pl.json`):**
```json
{
  "game": {
    "calculated_prize_pool": "Obliczona pula nagród",
    "override_prize_pool": "Nadpisz pulę nagród",
    "prize_pool_override_hint": "Dostosuj jeśli pominięto wpłaty podczas gry",
    "paid_positions": "Płatne pozycje",
    "payout_structure": "Struktura wypłat",
    "will_receive": "otrzyma",
    "no_player_assigned": "Jeszcze nie przypisano",
    "auto_assign_note": "{{count}} aktywnych graczy otrzyma automatycznie pozycje końcowe",
    "total_payout": "Suma wypłat",
    "payout_valid": "Wypłaty odpowiadają puli",
    "payout_invalid": "Wypłaty muszą równać się puli nagród"
  }
}
```

---

## Summary of Changes

| File | Change |
|------|--------|
| `src/components/game/EndGameDialog.tsx` | Complete rewrite with prize pool override, payout editor, validation |
| `src/pages/GameMode.tsx` | Pass currencySymbol to EndGameDialog |
| `src/i18n/locales/en.json` | Add new translation keys |
| `src/i18n/locales/pl.json` | Add Polish translations |

---

## User Experience After Implementation

### Scenario 1: Simple End (All players eliminated, no changes needed)
1. Click End Game
2. See calculated prize pool (£300) and auto-detected payouts
3. Winners already assigned from elimination order
4. Click "End Tournament" → Done

### Scenario 2: Forgot to Track Buy-ins
1. Click End Game
2. Notice prize pool shows £200, but actual pool was £300
3. Check "Override prize pool" → Enter £300
4. Adjust payout percentages or amounts as needed
5. Click "End Tournament" → Corrected payouts recorded

### Scenario 3: Custom Payout Split
1. Click End Game
2. Switch to currency mode (£)
3. Enter exact amounts: 1st = £150, 2nd = £100, 3rd = £50
4. Validation shows ✓ when total equals prize pool
5. Click "End Tournament" → Custom payouts recorded

### Scenario 4: Still Have Active Players
1. Click End Game with 2 players still active
2. See warning: "2 players will be auto-assigned positions (1st, 2nd)"
3. Configure payouts for those positions
4. Click "End Tournament" → Players auto-eliminated and paid

---

## Validation Rules

1. **Percentage Mode:** All percentages must sum to 100%
2. **Currency Mode:** All amounts must sum to prize pool (calculated or overridden)
3. **Active Players:** If >0 active, warn user they'll be auto-positioned
4. **Zero Prize Pool:** Show warning if no buy-ins recorded and no override

