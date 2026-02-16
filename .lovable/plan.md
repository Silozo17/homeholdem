

# Fix Poker Table: Cards/Names Outside Table + 15% Smaller on Mobile

## Problems (from screenshot)

1. **Cards render ON the table felt** -- they should be positioned OUTSIDE the table rail, extending outward from each seat
2. **Names and chip counts overlap the table** -- these should also be outside the rail
3. **Everything is too large for mobile landscape** -- avatars (44px), cards (40x56px), and text need to be ~15% smaller
4. **Seat positions need adjustment** -- some seats (especially B, C, F, G) are too far inside the table

## Solution

### 1. Add smaller size variants for mobile

**`src/components/poker/CardDisplay.tsx`**:
- Add an `xs` size: `w-7 h-10` (28x40px) -- roughly 30% smaller than `md`

**`src/components/poker/PlayerAvatar.tsx`**:
- Add an `xs` size: `w-8 h-8 text-xs` -- smaller than current `md` (44px)

### 2. Scale down PlayerSeat for mobile landscape

**`src/components/poker/PlayerSeat.tsx`**:
- Accept new `compact` prop (true on mobile landscape)
- When `compact=true`: use `xs` avatar size, `sm` card size, shrink text from `text-[11px]` to `text-[9px]`, chips from `text-[10px]` to `text-[8px]`
- The info stack positioning logic stays the same (side/above/below based on `sidePosition`) but everything is proportionally smaller

### 3. Ensure info stacks are OUTSIDE the table

The current `sidePosition` logic already positions info stacks outside the avatar. The real issue is that the **seat coordinates themselves** place avatars too far inside the table. The fix is to push seats outward so avatars sit ON the rail edge, which naturally pushes the info stacks (cards, name, chips) outside the table.

**`src/lib/poker/ui/seatLayout.ts`** -- Updated landscape coordinates:

| Seat | Current | New | Change |
|------|---------|-----|--------|
| Y | (50, 92) | (50, 95) | Push further down so cards extend below table |
| A | (22, 78) | (18, 82) | Push further toward bottom-left corner |
| B | (10, 50) | (6, 50) | Push further left -- info extends right, outside table |
| C | (14, 24) | (10, 20) | Push further toward upper-left corner |
| D | (32, 6) | (30, 2) | Push up so info extends above table |
| E | (78, 78) | (82, 82) | Mirror of A |
| F | (90, 50) | (94, 50) | Mirror of B |
| G | (86, 24) | (90, 20) | Mirror of C |
| H | (68, 6) | (70, 2) | Mirror of D |

### 4. Pass compact flag from PokerTablePro

**`src/components/poker/PokerTablePro.tsx`**:
- Detect mobile landscape (screen width < 900px and landscape) and pass `compact={true}` to each `PlayerSeat`
- This ensures desktop users still get the full-size UI

## Files to Modify

1. **`src/components/poker/PlayerAvatar.tsx`** -- Add `xs` size variant
2. **`src/components/poker/CardDisplay.tsx`** -- Add `xs` size variant  
3. **`src/components/poker/PlayerSeat.tsx`** -- Accept `compact` prop, use smaller sizes when true
4. **`src/lib/poker/ui/seatLayout.ts`** -- Push all landscape seat positions outward
5. **`src/components/poker/PokerTablePro.tsx`** -- Detect mobile, pass `compact` prop

