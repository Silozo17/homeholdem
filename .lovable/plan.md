

## Complete Poker Table Redesign: Players Around the Table

The current layout puts all bot players in a horizontal strip above the table -- this is fundamentally wrong. Every premium poker game seats players around the perimeter of an oval table. This plan rebuilds the entire table component from scratch with proper seating, removes the "Next Hand" modal, fixes "Check" behavior, and auto-advances between hands.

---

### Core Problems to Fix

1. **Players are NOT seated around the table** -- bots are in a row at the top, not positioned around the felt
2. **"Next Hand" modal blocks gameplay** -- real poker auto-deals the next hand after a brief showdown pause
3. **No dealer avatar** -- reference games show a dealer character at the top of the table
4. **Card dealing animation not visible** -- cards appear instantly rather than animating from a deck
5. **WinnerOverlay is a fullscreen modal** -- should be an inline banner/toast on the felt, not blocking the view

---

### 1. Arc/Perimeter Seat Layout (PokerTablePro.tsx -- full rewrite)

Replace the "bots at top, table in middle, human at bottom" layout with a single fullscreen view where:

- The entire screen IS the table (leather background + felt oval centered)
- Player seats are positioned around the oval table using absolute positioning with percentage-based coordinates
- For mobile portrait (our main case), seat positions for up to 8 bots + 1 human:
  - Human player: bottom center (50%, 88%)
  - Seats arranged clockwise from bottom-left around the top to bottom-right
  - Each seat shows: avatar, name, chip count, action badge, and face-down cards beside them
- Community cards and pot display in the center of the table
- Betting controls overlay at the very bottom of the screen

Seat position map (percentage-based for responsive scaling):

```text
              [Dealer Girl]
         S4 ---- S3 ---- S2
        /                    \
      S5                      S1
        \                    /
         S6 ---- S7 ---- S8
              [HUMAN]
```

Each seat is a self-contained component showing avatar + cards + info stacked vertically.

### 2. Dealer Avatar

Add a decorative dealer character at the top-center of the table:
- A styled "Dealer" indicator with a casino-themed icon (using CSS, no AI generation needed)
- Gold-bordered circular frame with a diamond/spade pattern
- Shows "DEALER" text below
- The dealer button (D chip) still rotates to the player who is dealing

### 3. Player Seat Component (new: PlayerSeat.tsx)

A new compact component for each seat around the table:
- Avatar circle (reuse PlayerAvatar with current-turn ring animation)
- Two mini face-down cards shown beside/below the avatar
- Name label (truncated to ~8 chars)
- Chip count in gold text
- Action badge (Fold/Call/Raise/Check/All-in) as a floating pill
- Bet amount shown between the seat and the center pot (as a small chip + number)
- Folded state: entire seat goes semi-transparent, cards slide away
- Current turn: golden ring pulse around avatar

### 4. Remove "Next Hand" Modal -- Auto-Advance

This is the biggest game flow fix:

**usePokerGame.ts changes:**
- When `hand_complete` phase is reached, show the winner banner for 2.5 seconds
- Then automatically dispatch `NEXT_HAND` (no user interaction needed)
- The WinnerOverlay becomes a brief inline announcement on the felt (not a modal)
- Only show a full modal on `game_over` (when someone is eliminated from the tournament)

**WinnerOverlay.tsx changes:**
- Convert from a fullscreen modal to a compact banner overlaid on the center of the felt
- Shows winner name + hand name + chip animation for ~2.5 seconds
- Auto-dismisses (no "Next Hand" button)
- Game over screen remains as a full overlay with stats

### 5. Fix Check Action

The check logic in `BettingControls.tsx` already dispatches `{ type: 'check' }` and the reducer handles it correctly (line 199-200 of usePokerGame.ts). The `canCheck` prop is computed correctly (line 525: `amountToCall === 0`).

The issue is likely in the betting round completion logic. When a player checks, the round should continue to the next player. The round ends when all active players have acted and all bets are equal. Need to verify the `lastRaiserIndex` logic handles the case where everyone checks (no raiser).

**Fix in usePokerGame.ts:**
- When `lastRaiserIndex` is `null` and a check happens, set a `roundStartIndex` to track when we've gone full circle
- The current logic `nextIdx === lastRaiserIndex` fails when `lastRaiserIndex` is `null` (nobody raised)
- Add: if `lastRaiserIndex === null` and we've gone around to the first player who acted this round, advance phase

### 6. Enhanced Card Dealing Animation

Cards should visually animate from a "deck" position to their destination:
- Add a CSS `@keyframes card-deal-from-deck` that starts cards at the top-center of the table (where the dealer is), scaled down and rotated, then translates them to their final position
- Each card gets a staggered `animation-delay` (0.1s apart)
- Community cards animate from the deck position to the center with a flip effect

### 7. Bet Amount Indicators

When a player bets, show their bet amount as a small chip + number positioned between their seat and the pot center. This is standard in all poker games shown in the reference screenshots.

---

### Technical Details

**New files:**
- `src/components/poker/PlayerSeat.tsx` -- self-contained seat component with avatar, cards, name, chips, action badge, and bet indicator

**Files to modify:**

1. **`src/components/poker/PokerTablePro.tsx`** -- Complete rewrite:
   - Remove horizontal bot strip layout
   - Implement absolute-positioned seats around the table
   - Define seat coordinate arrays for different player counts (2-9 players)
   - TableFelt becomes the full background with seats overlaid
   - Community cards and pot centered
   - Betting controls fixed at bottom
   - Add dealer avatar at top center
   - Remove "Next Hand" button from the felt

2. **`src/hooks/usePokerGame.ts`** -- Game flow fixes:
   - Add auto-advance timer: after `hand_complete`, wait 2.5s then dispatch `NEXT_HAND`
   - Fix check round-completion bug: track `roundStartIndex` when no raise has occurred, advance phase when we complete the circle
   - Add a `showdownDelay` state or use effect timing to control the brief winner display

3. **`src/components/poker/WinnerOverlay.tsx`** -- Convert to inline banner:
   - Remove fullscreen modal backdrop
   - Make it a positioned overlay on the felt center (not blocking interaction)
   - Show winner name + hand + chips for 2.5s then fade out
   - Keep fullscreen modal ONLY for game_over state

4. **`src/components/poker/PlayerAvatar.tsx`** -- Minor tweaks:
   - Ensure the turn-pulse ring works correctly at smaller sizes
   - Add "all-in" red glow variant

5. **`src/components/poker/BettingControls.tsx`** -- No logic changes needed (check already works), but verify the button correctly shows "Check" when `canCheck` is true

6. **`src/index.css`** -- Add new keyframes:
   - `card-deal-from-deck`: translate from top-center + scale(0.5) + rotate to final position
   - Refine existing animations for the new layout

7. **`src/components/poker/TableFelt.tsx`** -- Make it fill the entire screen area (remove margins), serve as the absolute positioning container for all seats

**No database or backend changes needed.**

