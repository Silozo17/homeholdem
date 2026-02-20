

# Redesign Hand Rankings to Match PokerStars Reference

## What Changes

The hand rankings display in both the **Tutorial Explainer (Page 3)** and the **Rules page** will be completely redesigned to match the PokerStars reference image layout. This is a visual-only change -- no game logic, navigation, or data changes.

## Key Design Elements from Reference

1. **Card layout**: Cards overlap/fan out (like holding a real hand), roughly 60-65% overlap between cards
2. **Card size**: Larger cards than current `xs` -- roughly 40-48px wide, 56-64px tall
3. **Card content**: Large rank in top-left corner, large suit symbol below it -- prominent and readable
4. **Row layout**: Cards on the LEFT side, rank number + hand name on the RIGHT side (opposite of current layout)
5. **"BEST" / "WORST" markers**: An upward arrow with "BEST" at the top of the list, and a downward arrow with "WORST" at the bottom
6. **Faded kicker cards**: In hands where some cards are "fillers" (e.g., the kicker in Four of a Kind, the non-pair cards in One Pair), those cards appear faded/dimmed to highlight the important cards
7. **No description text per row**: Just the hand name and number -- the description is removed from inline display for a cleaner look matching the reference

## Implementation Plan

### 1. Update `hand-ranking-examples.ts` -- Add "highlight" metadata

Add a `highlighted` array to each hand indicating which card indices are the important ones (the hand-making cards). Non-highlighted cards will be rendered faded.

For example:
- Royal Flush: all 5 highlighted (indices 0-4)
- Four of a Kind: indices 0-3 highlighted, index 4 (kicker) faded
- Two Pair: indices 0-1, 2-3 highlighted, index 4 (kicker) faded
- One Pair: indices 0-1 highlighted, indices 2-4 faded
- High Card: only index 0 highlighted, rest faded

### 2. Create new `HandRankingCard` component

A new purpose-built card component for this screen only (not reusing `CardDisplay` which is designed for gameplay). This card:
- Is roughly 44px wide x 60px tall
- Shows a large rank letter (top-left, ~14px bold) and suit symbol (~12px) below it
- White/cream background with subtle border and rounded corners
- Red (#C53030) for hearts/diamonds, black (#1A1A1A) for spades/clubs
- Supports an `isFaded` prop that applies `opacity-40` to dim kicker cards

### 3. Create new `FannedHand` component

Takes the array of cards + highlighted indices and renders them in an overlapping fan:
- Each card overlaps the previous by about 60% (negative margin-left of ~28px on cards after the first)
- Faded cards get `opacity-40`
- The row of cards is left-aligned

### 4. Create new `HandRankingsList` component

A shared component used by both Tutorial Page 3 and the Rules page. Layout per row:
- Left side: `FannedHand` (the overlapping cards)
- Right side: Rank number (bold, gold circle) + Hand name (bold white text)
- Vertically centered in each row
- Subtle divider or spacing between rows

"BEST" marker with upward triangle at the top-left, "WORST" marker with downward triangle at the bottom-left, styled in muted text.

### 5. Update `TutorialExplainer.tsx` (Page 3)

- Replace the current list with the new `HandRankingsList` component
- Remove the per-hand description text (just name + cards, matching reference)
- Keep the page title and subtitle

### 6. Update `PokerHandRankings.tsx` (Rules page accordion)

- Replace the hand-rankings accordion content with the same `HandRankingsList` component
- The accordion still wraps it, but the content inside matches the PokerStars layout

### 7. Update `MiniCardRow.tsx`

This component will no longer be used for hand rankings (replaced by `FannedHand`). It stays in the codebase in case it's used elsewhere, but will no longer be imported by the ranking screens.

## Files Modified

- **Edit**: `src/lib/poker/hand-ranking-examples.ts` -- add `highlighted` indices per hand
- **New**: `src/components/poker/HandRankingCard.tsx` -- large card for ranking display
- **New**: `src/components/poker/FannedHand.tsx` -- overlapping card fan
- **New**: `src/components/poker/HandRankingsList.tsx` -- full list with BEST/WORST markers
- **Edit**: `src/components/poker/TutorialExplainer.tsx` -- Page3 uses new component
- **Edit**: `src/components/clubs/PokerHandRankings.tsx` -- accordion content uses new component

## What Does NOT Change

- No game logic, hooks, or engine changes
- No layout/navigation/bottom nav changes
- Card data (which cards represent each hand) stays the same
- Other tutorial pages (1, 2, 4, 5) unchanged
- Rules page structure (accordion with betting rounds, actions, blinds) unchanged
- `CardDisplay.tsx` and `MiniCardRow.tsx` untouched (used elsewhere in gameplay)

