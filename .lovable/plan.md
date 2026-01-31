

## Plan: Fix Display Mode Consistency & Add Custom Buy-in/Rebuy Inputs

### Problems Identified

Based on my code analysis and your screenshots:

**Problem 1: Mixed Chips & Cash Display**
The "Display Mode" setting (Cash vs Chips) is not being applied consistently across the app. Several components still show BOTH values together, creating confusion:

| Location | Current Behavior | Expected (Cash Mode) | Expected (Chips Mode) |
|----------|------------------|----------------------|----------------------|
| Stats Bar "Avg Stack" | Shows chips (1,670) | Should show £16.70 | Shows 1,670 |
| Add Transaction dropdown | Shows "£30 → 1670 chips" | Shows "£30" only | Shows "1,670 chips" only |
| Bulk Buy-In dialog | Shows both £ and chips | Shows £ only | Shows chips only |
| Player transaction badge | Shows £30 | Correct | Should show chips |

**Problem 2: Cannot Add Custom Buy-in/Rebuy Amounts**
Currently:
- Custom add-on dialog exists ✓
- **Buy-ins** are locked to session default (no custom input)
- **Rebuys** are locked to session default (no custom input)

---

## Solution Overview

### Part 1: Pass Display Mode to All Components
Thread the `displayMode` setting through to:
- `BuyInTracker` component
- Stats bar in GameMode
- Create a utility function for consistent formatting

### Part 2: Update All Value Displays Based on Mode
In **Cash Mode**, show only cash values (e.g., "£30")
In **Chips Mode**, show only chip values (e.g., "1,670 chips")

### Part 3: Add Custom Buy-in/Rebuy Dialogs
Create dialogs similar to `CustomAddonDialog` that allow:
- Custom cash amount
- Custom chips amount
- For both buy-ins and rebuys

---

## Technical Implementation

### File 1: `src/pages/GameMode.tsx`

**Changes:**
1. Pass `displayMode` and `chipToCashRatio` to `BuyInTracker`
2. Format "Avg Stack" based on display mode

```tsx
// Stats bar - format avg stack based on mode
<div className="text-lg font-bold">
  {displayMode === 'cash' && chipToCashRatio > 0
    ? `${currencySymbol}${(avgStackChips * chipToCashRatio).toFixed(2).replace(/\.00$/, '')}`
    : avgStackChips.toLocaleString()
  }
</div>

// Pass props to BuyInTracker
<BuyInTracker
  ...existing props
  displayMode={displayMode}
  chipToCashRatio={chipToCashRatio}
/>
```

---

### File 2: `src/components/game/BuyInTracker.tsx`

**Major Changes:**

1. **Add new props:**
```tsx
interface BuyInTrackerProps {
  ...existing
  displayMode?: 'cash' | 'chips';
  chipToCashRatio?: number;
}
```

2. **Create format helper:**
```tsx
const formatValue = (amount: number, chips: number) => {
  if (displayMode === 'cash') {
    return `${currencySymbol}${amount}`;
  }
  return `${chips.toLocaleString()} chips`;
};
```

3. **Update Add Transaction dropdown:**
```tsx
// Before (shows both):
Buy-in ({currencySymbol}{session.buy_in_amount} → {session.starting_chips.toLocaleString()} chips)

// After (shows one based on mode):
Buy-in ({formatValue(session.buy_in_amount, session.starting_chips)})
```

4. **Create Custom Buy-in Dialog:**
Add a dialog similar to `CustomAddonDialog` that allows entering custom amounts for buy-ins.

5. **Create Custom Rebuy Dialog:**
Same for rebuys - allow custom amount/chips input.

6. **Update transaction type selection logic:**
When "Buy-in" or "Rebuy" is selected with custom amounts enabled, open the custom dialog instead of using preset values.

---

### File 3: `src/components/game/CustomBuyInDialog.tsx` (New)

```tsx
interface CustomBuyInDialogProps {
  isOpen: boolean;
  onClose: () => void;
  player: GamePlayer | null;
  defaultAmount: number;
  defaultChips: number;
  currencySymbol: string;
  transactionType: 'buyin' | 'rebuy';
  onConfirm: (amount: number, chips: number) => Promise<void>;
}

// Dialog with:
// - Player info display
// - Amount input (£)
// - Chips input
// - Confirm/Cancel buttons
```

---

### File 4: `src/components/game/CustomAddonDialog.tsx`

**Minor Update:**
The dialog shows both amount AND chips. Consider updating to respect display mode for the preview section, but keep both inputs available (since admin needs to set both values).

---

### File 5: `src/components/game/GameSettings.tsx`

**Updates:**
1. Group inputs more clearly with visual separation
2. Add info text explaining the relationship between cash and chips
3. Consider showing a calculated ratio: "£1 = 55.67 chips"

---

### File 6: `src/components/game/tv/DashboardMode.tsx` (and other TV modes)

**Already done** - TV modes already receive and use `blindsDisplayMode` for blinds. 
**Need to verify:** Average stack display in these modes.

---

## Updated Component Flow

```text
GameMode
  ├── useDisplayMode(clubId) → 'cash' | 'chips'
  ├── useChipToCashRatio(clubId) → number
  │
  ├── Stats Bar
  │   └── Avg Stack → formatValue(chips, mode)
  │
  ├── TournamentClock (already updated ✓)
  │   └── Blinds → formatBlind(chips, mode)
  │
  ├── BuyInTracker ← NEW: receives displayMode, chipToCashRatio
  │   ├── Summary totals → formatValue()
  │   ├── Player badges → formatValue()
  │   ├── Transaction dropdown → formatValue()
  │   ├── CustomBuyInDialog (new)
  │   ├── CustomRebuyDialog (or reuse with type param)
  │   └── CustomAddonDialog (existing)
  │
  └── TVDisplay (already updated ✓)
      └── All modes use blindsDisplayMode
```

---

## Summary of Changes

| File | Change |
|------|--------|
| `src/pages/GameMode.tsx` | Pass displayMode to BuyInTracker; format avg stack |
| `src/components/game/BuyInTracker.tsx` | Add displayMode prop; format all values; add custom buy-in/rebuy flow |
| `src/components/game/CustomBuyInDialog.tsx` | **New file** - dialog for custom buy-in/rebuy amounts |
| `src/components/game/CustomAddonDialog.tsx` | Minor: consider display mode in preview |
| `src/i18n/locales/en.json` | Add new translation keys |
| `src/i18n/locales/pl.json` | Add Polish translations |

---

## User Experience After Implementation

### Cash Mode (Default)
- **Avg Stack:** £16.70
- **Transaction dropdown:** "Buy-in (£30)" or "Rebuy (£30)" or "Add-on (£10)"
- **Player badge:** £30
- **Summary:** "Buy-ins: £300 | Rebuys: £0 | Add-ons: £60"
- **Custom input available:** Yes, tap "Add" → Select type → Enter custom £ amount

### Chips Mode
- **Avg Stack:** 1,670
- **Transaction dropdown:** "Buy-in (1,670 chips)" or "Rebuy (1,670 chips)"
- **Player badge:** 1,670 chips
- **Summary:** "Buy-ins: 16,700 chips | Rebuys: 0 | Add-ons: 5,570 chips"
- **Custom input available:** Yes, tap "Add" → Select type → Enter custom chip amount

### Adding a Custom Transaction
1. Admin taps "+ Add"
2. Selects player from dropdown
3. Selects type: Buy-in / Rebuy / Add-on
4. Dialog opens with editable fields:
   - **Amount (£):** Pre-filled with default, editable
   - **Chips:** Pre-filled with default, editable
5. Taps "Add [Type]" to confirm

---

## Edge Cases Handled

1. **Prize Pool always shows cash** - This is correct since payouts are real money
2. **Chip-to-cash ratio of 0** - Falls back to showing chips
3. **Display mode not set** - Defaults to 'cash'
4. **Existing transactions** - Displayed correctly based on stored amount/chips values

