

# Increase Betting Button Size and Spacing

## What Changes

In `src/components/poker/BettingControls.tsx`:

### Portrait mode (bottom bar)
- Button height: `h-11` (44px) -> `h-[51px]` (44 * 1.15 = ~51px, 15% larger)
- Gap between buttons: `gap-2` (8px) -> `gap-[11px]` (8 + 3 = 11px)

Affected lines: the portrait `<div className="flex gap-2 w-full">` container (appears once for the main button row) and the three buttons (Fold, Call/Check, Raise) which all use `h-11`.

### Landscape mode (vertical panel)
- Button height: `h-8` (32px) -> `h-[37px]` (32 * 1.15 = ~37px, 15% larger)
- Gap between buttons: `gap-1.5` (6px) -> `gap-[9px]` (6 + 3 = 9px)

Affected lines: the landscape outer `<div className="flex flex-col gap-1.5">` container and the Fold, Call/Check, Raise buttons which use `h-8`.

### Specific lines to edit

**Portrait button row (line ~189):** `gap-2` -> `gap-[11px]`

**Portrait buttons (lines ~192, ~206, ~222):** `h-11` -> `h-[51px]` (Fold, Call/Check, Raise)

**Landscape outer container (line ~76):** `gap-1.5` -> `gap-[9px]`

**Landscape buttons (lines ~115, ~123, ~133, ~149):** `h-8` -> `h-[37px]` (Cancel, Fold, Call/Check, Raise)

### What is NOT changed
- Button colors, gradients, borders, shadows
- Icon sizes, label text
- Quick bet buttons, slider, raise panel
- Cancel button in portrait mode (slider dismiss)
- No layout, navigation, or positioning changes
- No other files

