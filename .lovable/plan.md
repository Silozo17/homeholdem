

# Pixel-Perfect Hand Rankings Redesign

## Detailed Reference Analysis

Here is every visual element from the PokerStars reference, broken down:

### Card Container ("Card Tray")
- All 5 cards sit inside **ONE rounded rectangle** (not separate individual cards)
- Rounded corners ~6px on the outer container only
- Cards are side-by-side with **zero gap, zero overlap**
- Thin vertical divider lines (~1px light gray) separate each card cell
- Container has a subtle border/shadow

### Individual Card Cells
- Each cell is equal width (~36-40px)
- **Rank**: large bold text (~16px), positioned top-left with small padding
- **Suit symbol**: directly below the rank, same left alignment, ~14px
- Colors: **red (#DC2626)** for hearts/diamonds, **black (#1A1A1A)** for spades/clubs
- **Highlighted cards**: pure white background
- **Faded/kicker cards**: solid **gray background (#D4D4D4)** -- NOT opacity! The text is still fully visible but the background changes to gray

### BEST / WORST Markers
- Positioned on the **left edge**, text **rotated 90 degrees** (reading bottom-to-top for BEST, top-to-bottom for WORST)
- BEST: green/emerald text with upward chevron, aligned to the top rows
- WORST: red text with downward chevron, aligned to the bottom rows
- They sit outside the card rows, in a narrow left column

### Row Layout (per hand)
- **Left**: card tray container (5 cells)
- **Right**: rank number in a small filled circle (amber/gold) + hand name in bold white text
- Vertically centered
- Rows separated by spacing (~8-12px), no visible divider lines between rows

### Overall Layout
- Compact vertical list
- Background is the dark app background (our existing card-suit-pattern)

---

## Current vs Required Changes

| Element | Current (Wrong) | Required |
|---------|-----------------|----------|
| Card overlap | -26px overlap between cards | Zero overlap, side by side |
| Fading | `opacity-35` on entire card | Gray background (#D4D4D4), full opacity |
| Card container | Each card is a separate rounded div | All 5 cards inside ONE rounded container |
| BEST/WORST | Horizontal text above/below list | Rotated 90deg on the left side |
| Card dividers | Card borders create implicit gaps | Thin 1px internal dividers, no outer per-card border |

---

## Implementation Plan

### 1. Rewrite `HandRankingCard.tsx`
- Remove individual card border and rounded corners (the parent container handles those)
- Change `isFaded` from `opacity-35` to `bg-[#D4D4D4]` (gray background, full opacity)
- Keep rank + suit text layout the same (top-left aligned, stacked)
- Card cell width: ~36px, height: ~52px

### 2. Rewrite `FannedHand.tsx` (rename concept to "CardTray")
- Remove negative margins (no overlap)
- Wrap all cards in a single container with `rounded-lg`, `overflow-hidden`, `border`
- Cards sit in a flex row with no gap
- Add 1px right border on each card except the last (internal dividers)
- No z-index manipulation needed

### 3. Rewrite `HandRankingsList.tsx`
- Add a narrow left column for BEST/WORST markers
- BEST text: rotated -90deg (reads bottom-to-top), positioned at top of list, emerald/green
- WORST text: rotated -90deg, positioned at bottom of list, red
- Main content area: the 10 hand rows
- Each row: card tray (left) + rank circle + name (right)
- Remove the current horizontal BEST/WORST divs

### Files Modified
- `src/components/poker/HandRankingCard.tsx` -- gray bg instead of opacity, remove per-card border
- `src/components/poker/FannedHand.tsx` -- single container, no overlap, internal dividers
- `src/components/poker/HandRankingsList.tsx` -- rotated BEST/WORST on left side

### What Does NOT Change
- `hand-ranking-examples.ts` data (cards + highlighted indices stay the same)
- `TutorialExplainer.tsx` (just imports HandRankingsList, no changes needed)
- `PokerHandRankings.tsx` (just imports HandRankingsList, no changes needed)
- No layout, navigation, bottom nav, or game logic changes

