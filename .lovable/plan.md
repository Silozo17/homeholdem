

# Unify Online Multiplayer Table with Bot Table Layout

## Problem

The online multiplayer (MP) table and the bot table (`PokerTablePro`) use completely different layout systems, resulting in a visually inconsistent experience:

| Aspect | Bot Table (PokerTablePro) | MP Table (OnlinePokerTable) |
|--------|--------------------------|----------------------------|
| **Table wrapper** | 16:9 aspect ratio, `min(88vw, 1100px)` width, `82vh` max-height | `TableFelt` with children (legacy mode), no fixed aspect ratio |
| **Seat positions** | `getSeatPositions()` from `seatLayout.ts` (9-anchor system with precise rail coordinates) | Hardcoded `SEAT_POSITIONS` object with different coordinates |
| **Seat component** | `PlayerSeat` (rich: avatar, nameplate bar, card fan, dealer button, timer, bet chip) via `SeatAnchor` | Inline `OnlineSeatDisplay` (simpler: basic avatar, plain text name/stack) |
| **Hero rendering** | Inline with all seats at position 0 (bottom center) | Separated into a bottom panel outside the table |
| **Orientation** | Landscape-locked with portrait blocker | No orientation handling |
| **Z-index system** | `Z` constants from `z.ts` | Hardcoded `z-10`, `z-20`, etc. |
| **Background** | Leather image + radial gradient vignette | Leather image + flat `bg-black/30` |

## Solution

Refactor `OnlinePokerTable.tsx` to adopt the same layout architecture as `PokerTablePro`:

### 1. Replace Table Layout with 16:9 Wrapper Pattern

Remove the `<TableFelt className="...">` children mode. Instead use the same structure as the bot table:

```
<div className="absolute inset-0 flex items-center justify-center" style={{ zIndex: Z.TABLE }}>
  <div className="relative" style={{
    aspectRatio: '16 / 9',
    width: isLandscape ? 'min(88vw, 1100px)' : 'min(96vw, 1100px)',
    maxHeight: isLandscape ? '82vh' : '80vh',
    overflow: 'visible',
  }}>
    <TableFelt />  {/* visual-only mode, no children */}
    {/* Dealer, pot, cards, seats all positioned inside */}
  </div>
</div>
```

### 2. Replace Seat Positions with `seatLayout.ts`

Remove the hardcoded `SEAT_POSITIONS` object. Import and use `getSeatPositions()` and `CARDS_PLACEMENT` from `seatLayout.ts`. Use `SeatAnchor` for positioning, which centers children at `(xPct%, yPct%)` with `translate(-50%, -50%)`.

### 3. Render Hero Inline (Not in Separate Bottom Panel)

Stop separating "my seat" into a bottom panel. Render the hero at position 0 (bottom center) just like all other seats, using `SeatAnchor`. This ensures consistent visual treatment -- same avatar size, same nameplate, same card display.

The hero's hole cards will display using the same fanned-behind-avatar pattern as in the bot table, and betting controls will overlay at the bottom of the screen (same positioning as bot table).

### 4. Adapt PlayerSeat for Online Data

Create a thin adapter that maps `OnlineSeatInfo` to the `PokerPlayer` shape expected by `PlayerSeat`:

```typescript
function toPokerPlayer(seat: OnlineSeatInfo, isDealer: boolean): PokerPlayer {
  return {
    id: seat.player_id!,
    name: seat.display_name,
    chips: seat.stack,
    status: seat.status === 'folded' ? 'folded' : seat.status === 'all-in' ? 'all-in' : 'active',
    holeCards: [], // filled separately for hero
    currentBet: seat.current_bet ?? 0,
    lastAction: seat.last_action ?? null,
    isDealer,
    seatIndex: seat.seat,
  };
}
```

For the hero, inject `myCards` into `holeCards`. For opponents, keep empty (cards show face-down via `has_cards`).

### 5. Add Landscape Lock and Portrait Blocker

Import `useIsLandscape` and `useLockLandscape` (same hooks used in `PokerTablePro`). Add the portrait rotation prompt overlay.

### 6. Use Z Constants

Replace all hardcoded z-index values with imports from `z.ts`.

### 7. Use Same Background Treatment

Replace `bg-black/30` with the radial gradient vignette used in the bot table.

## Files to Modify

| File | Change |
|------|--------|
| `src/components/poker/OnlinePokerTable.tsx` | Major refactor: replace layout, seat system, hero rendering, add landscape lock, use Z constants |

## What Stays the Same

- Seat rotation logic (hero perspective) -- already implemented, will continue to work
- All game actions (join, leave, start hand, send action, kick, close)
- Header bar with table name, invite, sound, admin menu
- Connection overlay, invite dialog, kick/close dialogs
- Sound triggers and dealer expression changes
- Buy-in input for spectators (moved to overlay on empty seat tap)

## Visual Result After Fix

Both tables will look identical:
- Same premium table asset at 16:9 with leather background
- Same avatar sizes (xl/2xl) positioned on the rail edge
- Same nameplate bars below avatars
- Same card fan behind hero's avatar
- Same dealer character at top center
- Same pot and community card positioning
- Same landscape-first orientation

