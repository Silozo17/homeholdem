

# Translate Betting Controls & Pre-Action Buttons

## Problem

Two components have hardcoded English text for action buttons:

### `src/components/poker/BettingControls.tsx`
- "Fold" (lines 153, 275)
- "Check" (in `callLabel`, line 64)
- "Call {amount}" (line 67)
- "All-in {amount}" (line 66)
- "Raise" / "Raise {amount}" (lines 70-71)
- "All-in" in slider display (lines 122, 240)
- "Cancel" (lines 136, 256)

### `src/components/poker/PreActionButtons.tsx`
- "Check/Fold", "Call Any", "Check" (lines 14-16)

## Existing Keys

Translation keys already exist and have Polish translations:

| Key | EN | PL |
|-----|----|----|
| `poker_table.fold` | Fold | Fold (Pas) |
| `poker_table.check` | Check | Check (Czekaj) |
| `poker_table.call` | Call | Call (Sprawdź) |
| `poker_table.raise` | Raise | Raise (Podbij) |
| `poker_table.all_in` | All-in | All-in (Wszystko) |
| `common.cancel` | Cancel | Anuluj |

## Changes

### File: `src/components/poker/BettingControls.tsx`
- Add `useTranslation` import and `const { t } = useTranslation()` at the top of the component
- Replace `callLabel` construction:
  - `'Check'` with `t('poker_table.check')`
  - `` `All-in ${playerChips.toLocaleString()}` `` with `` `${t('poker_table.all_in')} ${playerChips.toLocaleString()}` ``
  - `` `Call ${amountToCall.toLocaleString()}` `` with `` `${t('poker_table.call')} ${amountToCall.toLocaleString()}` ``
- Replace `raiseLabel`:
  - `'All-in'` with `t('poker_table.all_in')`
  - `` `Raise ${raiseAmount.toLocaleString()}` `` with `` `${t('poker_table.raise')} ${raiseAmount.toLocaleString()}` ``
  - `'Raise'` with `t('poker_table.raise')`
- Replace "Cancel" (2 occurrences) with `t('common.cancel')`
- Replace "Fold" (2 occurrences) with `t('poker_table.fold')`
- Replace slider "All-in" text (2 occurrences) with `t('poker_table.all_in')`

### File: `src/components/poker/PreActionButtons.tsx`
- Add `useTranslation` import and call
- Replace ACTIONS array labels:
  - Move array inside component to access `t()`
  - `'Check/Fold'` with `t('poker_table.check') + '/' + t('poker_table.fold')`
  - `'Call Any'` with `t('poker_table.call_any')`
  - `'Check'` with `t('poker_table.check')`

### File: `src/i18n/locales/en.json`
- Add `"call_any": "Call Any"` to the `poker_table` namespace

### File: `src/i18n/locales/pl.json`
- Add `"call_any": "Sprawdź każdy"` to the `poker_table` namespace

## What Does NOT Change
- Layout, positioning, sizing, spacing
- Button styles, colors, z-index
- Game engine, hooks, reducers
- Bottom navigation
- Any other component
