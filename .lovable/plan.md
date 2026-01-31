

## Plan: Fix Number Input Fields in End Game Dialog

### Problem Summary

Based on your screenshot and description, there are input handling issues:

1. **Cannot type "2"** - The number gets cleared or behaves unexpectedly
2. **Auto-fills with 0** - When clearing a field, it immediately shows "0" instead of being empty
3. **Result: "0260"** - When you try to clear and type "260", you get "0260" because the 0 appears instantly

### Root Cause

The current code uses this pattern:
```typescript
onChange={(e) => handleCurrencyChange(index, e.target.value)}

const handleCurrencyChange = (index: number, value: string) => {
  const numValue = parseInt(value) || 0;  // ❌ Problem: "" becomes 0 immediately
  // ...
};
```

When you:
- Clear the field → `parseInt("")` returns `NaN` → `NaN || 0` becomes `0` → field shows "0"
- Try to type "260" → You're typing into "0" → Result is "0260"

---

## Solution

Use **string state** for input values while editing, and only convert to numbers on blur or for calculations.

### Changes Required

**File: `src/components/game/EndGameDialog.tsx`**

1. **Add string state for editing:**
```typescript
// String states to allow empty inputs while typing
const [percentageInputs, setPercentageInputs] = useState<string[]>(['', '', '', '', '']);
const [currencyInputs, setCurrencyInputs] = useState<string[]>(['', '', '', '', '']);
const [customPrizePoolInput, setCustomPrizePoolInput] = useState<string>('');
```

2. **Initialize from numeric values when dialog opens:**
```typescript
useEffect(() => {
  if (open) {
    // Convert numbers to strings for editing
    const preset = PAYOUT_PRESETS[defaultPositions] || [100];
    setPercentageInputs(preset.map(n => n.toString()).concat(['', '', '', '', '']).slice(0, 5));
    setCurrencyInputs(['', '', '', '', '']);
    setCustomPrizePoolInput(calculatedPrizePool.toString());
  }
}, [open]);
```

3. **Update handlers to work with strings:**
```typescript
const handlePercentageInputChange = (index: number, value: string) => {
  // Allow empty string or valid numbers only
  if (value === '' || /^\d*$/.test(value)) {
    const newInputs = [...percentageInputs];
    newInputs[index] = value;
    setPercentageInputs(newInputs);
    
    // Update numeric state for calculations
    const numValue = value === '' ? 0 : parseInt(value);
    const newPayouts = [...percentagePayouts];
    newPayouts[index] = numValue;
    setPercentagePayouts(newPayouts);
  }
};

const handleCurrencyInputChange = (index: number, value: string) => {
  if (value === '' || /^\d*$/.test(value)) {
    const newInputs = [...currencyInputs];
    newInputs[index] = value;
    setCurrencyInputs(newInputs);
    
    const numValue = value === '' ? 0 : parseInt(value);
    const newPayouts = [...currencyPayouts];
    newPayouts[index] = numValue;
    setCurrencyPayouts(newPayouts);
    
    // Update percentages based on currency
    if (effectivePrizePool > 0) {
      const newPercentages = newPayouts.map(amt => 
        Math.round((amt / effectivePrizePool) * 100)
      );
      setPercentagePayouts(newPercentages);
    }
  }
};
```

4. **Add blur handlers to normalize empty fields:**
```typescript
const handleBlur = (index: number, mode: 'percentage' | 'currency') => {
  if (mode === 'percentage') {
    const newInputs = [...percentageInputs];
    if (newInputs[index] === '') {
      newInputs[index] = '0';
    }
    setPercentageInputs(newInputs);
  } else {
    const newInputs = [...currencyInputs];
    if (newInputs[index] === '') {
      newInputs[index] = '0';
    }
    setCurrencyInputs(newInputs);
  }
};
```

5. **Update Input components to use string values:**
```tsx
{/* Percentage Input */}
<Input
  type="text"           // Change from "number" to "text"
  inputMode="numeric"   // Mobile keyboard will still show numbers
  pattern="[0-9]*"      // HTML5 validation for numbers
  value={percentageInputs[index]}
  onChange={(e) => handlePercentageInputChange(index, e.target.value)}
  onBlur={() => handleBlur(index, 'percentage')}
  className="w-16 h-8 text-center"
/>

{/* Currency Input */}
<Input
  type="text"
  inputMode="numeric"
  pattern="[0-9]*"
  value={currencyInputs[index]}
  onChange={(e) => handleCurrencyInputChange(index, e.target.value)}
  onBlur={() => handleBlur(index, 'currency')}
  className="w-20 h-8 text-center"
/>

{/* Prize Pool Override Input */}
<Input
  type="text"
  inputMode="numeric"
  pattern="[0-9]*"
  value={customPrizePoolInput}
  onChange={(e) => {
    const value = e.target.value;
    if (value === '' || /^\d*$/.test(value)) {
      setCustomPrizePoolInput(value);
      setCustomPrizePool(value === '' ? 0 : parseInt(value));
    }
  }}
  onBlur={() => {
    if (customPrizePoolInput === '') {
      setCustomPrizePoolInput('0');
    }
  }}
  className="w-32"
/>
```

---

**File: `src/components/game/CustomTransactionDialog.tsx`**

Apply the same pattern for consistency:

```typescript
const [amountInput, setAmountInput] = useState('');
const [chipsInput, setChipsInput] = useState('');

useEffect(() => {
  if (isOpen) {
    setAmountInput(defaultAmount.toString());
    setChipsInput(defaultChips.toString());
  }
}, [isOpen, defaultAmount, defaultChips]);

// In inputs:
<Input
  type="text"
  inputMode="numeric"
  pattern="[0-9]*"
  value={amountInput}
  onChange={(e) => {
    const value = e.target.value;
    if (value === '' || /^\d*$/.test(value)) {
      setAmountInput(value);
      setAmount(value === '' ? 0 : parseInt(value));
    }
  }}
  onBlur={() => {
    if (amountInput === '') setAmountInput('0');
  }}
/>
```

---

## Summary of Changes

| File | Change |
|------|--------|
| `src/components/game/EndGameDialog.tsx` | Use string state for inputs, add blur handlers, change to type="text" with inputMode="numeric" |
| `src/components/game/CustomTransactionDialog.tsx` | Same pattern for consistency |

---

## Expected Behavior After Fix

| Action | Before (Broken) | After (Fixed) |
|--------|-----------------|---------------|
| Clear field | Shows "0" immediately | Shows empty field |
| Type "2" | Might not work | Shows "2" |
| Clear → Type "260" | Shows "0260" | Shows "260" |
| Leave empty field | N/A | Shows "0" on blur |
| Submit with empty | Could cause issues | Uses 0 for calculations |

---

## Technical Notes

- Using `type="text"` with `inputMode="numeric"` is the recommended approach for mobile-friendly number inputs that need custom validation
- The regex `/^\d*$/` allows only digits (or empty string)
- String state allows natural editing behavior while numeric state maintains calculation accuracy
- Blur handlers ensure proper formatting when user moves away from field

