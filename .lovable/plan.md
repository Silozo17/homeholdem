

# Fix Poker Page Spacing, Card Clipping, and Overflow

## Issues from Screenshots

1. **Too much space above content** (PokerHub + PlayPokerLobby): Both pages use `justify-center` on their flex container, which vertically centers all content in the available space. With the fixed header spacer, this creates a large empty gap above the title/cards.

2. **Tournament page -- not enough top space**: The content area starts immediately after the header spacer with no top padding, so "Tournaments" title feels cramped against the header.

3. **Tournament CardFan clipped at bottom**: The CardFan has `overflow-hidden` and `minHeight: 96px`, but the rotated cards extend below that boundary and get cut off.

4. **Tournament page overflows on right**: The action row buttons (`Create Tournament` + `Join by Code`) use `flex-1` with `p-4` and inner elements that can exceed the viewport width on narrow screens.

## Fixes

### 1. PokerHub -- Remove vertical centering, use top-aligned layout

**File: `src/pages/PokerHub.tsx`**
- Change `justify-center` to `justify-start` on the content container
- Add `pt-6` for breathing room below header
- Keep `overflow-hidden` to prevent scroll

### 2. PlayPokerLobby -- Same top-alignment fix

**File: `src/components/poker/PlayPokerLobby.tsx`**
- Change `justify-center` to `justify-start` on the content container
- Add `pt-4` for spacing below header
- Reduce `space-y-4` to `space-y-3` to keep everything fitting

### 3. TournamentLobby -- Add top padding + fix overflow

**File: `src/components/poker/TournamentLobby.tsx`**
- Add `pt-4` to the content area for both list view and detail view
- Add `overflow-x-hidden` to the outer container to prevent horizontal overflow
- On the action row, add `min-w-0` to the inner text containers and ensure buttons don't exceed viewport

### 4. OnlinePokerLobby -- Same overflow prevention

**File: `src/components/poker/OnlinePokerLobby.tsx`**
- Add `overflow-x-hidden` to the outer container
- Add `pt-4` to the content area for consistent spacing

### 5. CardFan -- Fix bottom clipping

**File: `src/components/poker/CardFan.tsx`**
- Increase non-compact `minHeight` from `96` to `112` to accommodate rotated card edges
- Keep `overflow-hidden` for compact mode (where it fits)
- For non-compact mode, use `overflow-visible` so rotated cards aren't clipped, but wrap in a container with adequate height

## Files to Modify

1. `src/pages/PokerHub.tsx` -- Replace `justify-center` with `justify-start pt-6`
2. `src/components/poker/PlayPokerLobby.tsx` -- Replace `justify-center` with `justify-start pt-4`
3. `src/components/poker/TournamentLobby.tsx` -- Add `pt-4` to content, add `overflow-x-hidden`
4. `src/components/poker/OnlinePokerLobby.tsx` -- Add `pt-4` to content, add `overflow-x-hidden`
5. `src/components/poker/CardFan.tsx` -- Increase non-compact minHeight and adjust overflow

