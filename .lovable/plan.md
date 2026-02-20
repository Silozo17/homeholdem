

# Fix: Betting Controls Showing Raw Translation Keys

## Root Cause

The `BettingControls.tsx` component uses translation keys like `t('poker_table.fold')`, `t('poker_table.check')`, `t('poker_table.call')`, `t('poker_table.raise')`, and `t('poker_table.all_in')` -- but **these keys do not exist** in the `poker_table` namespace.

The actual keys exist in the `poker_online` namespace (e.g., `poker_online.fold`, `poker_online.check`), which is why the `t()` function returns the raw key path as a fallback string.

Similarly, `PreActionButtons.tsx` uses `t('poker_table.call_any')`, which also only exists under `poker_online`.

## Fix

Add the missing keys to the `poker_table` namespace in both locale files. This is the smallest change -- no component code needs to change.

### File: `src/i18n/locales/en.json`

Add these keys inside the `poker_table` object (before the closing brace at line 1265):

```json
"fold": "Fold",
"check": "Check",
"call": "Call",
"raise": "Raise",
"all_in": "All-in",
"call_any": "Call Any"
```

### File: `src/i18n/locales/pl.json`

Add the matching Polish keys inside the `poker_table` object:

```json
"fold": "Pas",
"check": "Czekaj",
"call": "Sprawdź",
"raise": "Podbij",
"all_in": "Wszystko",
"call_any": "Sprawdź każdy"
```

## What Does NOT Change
- No component files are modified
- No layout, styling, or button sizing changes
- No game logic or hook changes
- Bottom navigation untouched

