

# Fix: Dealer Position on iPhone 15 Pro Max

## Problem

The dealer's `top` position uses the `isMobileLandscape` flag, which requires `window.innerWidth < 900`. The iPhone 15 Pro Max landscape viewport is ~932px wide, so it fails this check and gets the portrait value (`-22%`) instead of the landscape value (`-14%`).

- iPhone 16 Pro landscape: ~874px wide -- passes `< 900` check -- gets `-14%` (correct)
- iPhone 15 Pro Max landscape: ~932px wide -- fails `< 900` check -- gets `-22%` (wrong)

## Fix

**File:** `src/components/poker/PokerTablePro.tsx`, line 347

Use `isLandscape` (which simply checks `width > height`) instead of `isMobileLandscape` for the dealer's top position. This correctly applies `-14%` for all landscape orientations and `-22%` for all portrait orientations.

Current:
```typescript
style={{ top: isMobileLandscape ? '-14%' : '-22%', zIndex: Z.DEALER }}
```

New:
```typescript
style={{ top: isLandscape ? '-14%' : '-22%', zIndex: Z.DEALER }}
```

## What Changes
- `src/components/poker/PokerTablePro.tsx` line 347: `isMobileLandscape` replaced with `isLandscape` for the dealer top value only

## What Does NOT Change
- No other positions, seats, cards, or layouts
- No changes to `isMobileLandscape` usage elsewhere (it is still used for compact mode on PlayerSeat)
- DealerCharacter component untouched
- Bottom nav untouched

