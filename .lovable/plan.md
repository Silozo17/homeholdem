

# Replace Dealer Icon & Change Game Background

## 1. Add New Assets

Copy both uploaded images into the project:
- `user-uploads://ChatGPT_Image_Feb_16_2026_11_04_23_PM.png` to `src/assets/dealer/dealer-girl.png`
- `user-uploads://poker_background.webp` to `src/assets/poker-background.webp`

## 2. Replace Dealer Character

**File**: `src/components/poker/DealerCharacter.tsx`

Replace the circular avatar frame with the full dealer girl image. Instead of a small round icon, render a larger rectangular/transparent PNG image positioned so she appears to be sitting at the edge of the table, leaning forward. Remove the round border, inner ring, and Crown fallback. Keep the spotlight glow, sparkle effects on win, and the "Dealer" label.

Key styling changes:
- Remove `rounded-full`, `overflow-hidden`, and circular sizing
- Use the full image at approximately `clamp(80px, 18vw, 120px)` width with `object-contain`
- Import from `@/assets/dealer/dealer-girl.png` instead of `dealer-main.png`

## 3. Reposition Dealer on Table

**Files**: `src/components/poker/PokerTablePro.tsx`, `src/components/poker/OnlinePokerTable.tsx`

Move the dealer container from `top: 2%` to `top: -4%` so the girl appears to be sitting behind the table edge, with her lower body hidden by the table felt. This creates the illusion of her sitting in front of the table.

## 4. Replace Background Image

**Files**: `src/components/poker/PokerTablePro.tsx`, `src/components/poker/OnlinePokerTable.tsx`

Replace the `leatherBg` import with the new `poker-background.webp`. Change:
```
import leatherBg from '@/assets/leather-bg.jpg';
```
to:
```
import pokerBg from '@/assets/poker-background.webp';
```

Update both `<img>` tags that render the background to use `pokerBg` instead of `leatherBg`.

## Summary

| # | Change | Files |
|---|--------|-------|
| 1 | Copy new assets | `src/assets/dealer/dealer-girl.png`, `src/assets/poker-background.webp` |
| 2 | Redesign dealer character | `DealerCharacter.tsx` |
| 3 | Reposition dealer on table | `PokerTablePro.tsx`, `OnlinePokerTable.tsx` |
| 4 | Replace background image | `PokerTablePro.tsx`, `OnlinePokerTable.tsx` |

