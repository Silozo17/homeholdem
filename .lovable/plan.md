
# Analysis and Improvements Plan

## 1. Hide Bottom Navigation in Online Poker Game Mode

**Problem**: When a user joins/creates an online poker table (or tournament table), the `OnlinePokerTable` component renders inside the `AppLayout` which still shows the `BottomNav`. The table uses `fixed inset-0` but the nav sits on top at z-50.

**Fix**: Add `/online-poker` and `/poker-tournament` to the `hiddenNavRoutes` logic in `AppLayout.tsx`. However, since the nav should only hide when the user is *at a table* (not the lobby), we need a smarter approach. The `OnlinePokerTable` already uses `fixed inset-0`, so the simplest fix is to add the route patterns to `fullscreenRoutes` conditionally, or better: detect when `OnlinePokerTable` is active.

**Approach**: The cleanest solution is to have the `OnlinePoker` and `PokerTournament` pages signal when a table is active. We can do this by checking if the URL contains a query param or by adding these routes to `fullscreenRoutes` and using a state signal. The simplest approach: add `/play-poker` and detect the `activeTableId` state by wrapping `OnlinePokerTable` so it sets a class/attribute on the body, or simply hide the nav from within the component itself using a portal-level z-index override.

**Simplest fix**: The `OnlinePokerTable` already renders as `fixed inset-0` but the `BottomNav` is at `z-50`. The table content is at `z-20`. We should add the online poker and tournament routes to a detection list in `AppLayout`, but only when the table component is mounted. Since both `OnlinePoker` and `PokerTournament` pages manage `activeTableId` state internally and we can't easily pass that to `AppLayout`, the cleanest fix is:
- Add a CSS-level override: render a `<style>` tag inside `OnlinePokerTable` that hides `.bottom-nav`
- OR: add a data attribute to the body when table is active and hide nav via CSS
- OR: simply increase the z-index of the `OnlinePokerTable` overlay above the nav (z-50+)

**Chosen approach**: Set `z-index: 60` on the `OnlinePokerTable` root container so it renders above the bottom nav (z-50). This is the least invasive change.

**File**: `src/components/poker/OnlinePokerTable.tsx` -- Change `<div className="fixed inset-0 flex flex-col overflow-hidden">` to include `z-[60]`.

---

## 2. Hand Evaluator and Game Rules Analysis

**Assessment**: The hand evaluator is well-implemented and thoroughly tested:
- Correctly handles all 10 hand rankings (High Card through Royal Flush)
- Ace-low straights (wheel) are properly detected
- Best-5-of-7 selection via combinations is correct
- Tiebreaker scoring uses a polynomial encoding (rank * 10^10 + kickers) which correctly orders hands
- 26 unit tests cover edge cases including kicker comparisons, split pots, and 7-card evaluation
- Side pot calculation and distribution logic is correct -- uses ascending all-in levels and distributes to eligible players

**Winner/Loser animations**: The `WinnerOverlay` component has two modes:
- **Hand complete (inline banner)**: Shows gold serif hand name with particle effects, positioned at 22% from top. Includes animated chip counter.
- **Game over (full overlay)**: Shows trophy, stats grid (hands played, won, best hand, biggest pot, duration), and Play Again/Quit buttons.

**No issues found** with the hand evaluation, winner determination, or animation logic. The rules implementation is correct per standard Texas Hold'em.

---

## 3. Bot AI Improvements

**Current state**: Bots use a simple two-tier system:
- Preflop: score based on pair bonus, high card, suited/connected bonuses (0-100 scale)
- Postflop: maps hand rank to a fixed strength score (High Card=15, Pair=35, etc.)
- Decision thresholds: >75 = strong (raise/call), 40-75 = medium (call), <40 = weak (fold)
- ~8% bluff chance, no position awareness, no pot odds, no opponent modeling

**Improvements**:

### A. Bot Personality System
Add distinct personality profiles that modify decision-making:
- **"Shark" (tight-aggressive)**: Higher fold threshold, larger raises, less bluffing
- **"Maniac" (loose-aggressive)**: Lower fold threshold, frequent raises, high bluff factor
- **"Rock" (tight-passive)**: High fold threshold, rarely raises, almost no bluffs
- **"Fish" (loose-passive)**: Calls everything, rarely raises
- **"Pro" (balanced)**: Uses pot odds, position-aware, mixed strategy

### B. Smarter Decision Making
- **Pot odds awareness**: Compare call amount to pot size -- call when hand strength justifies the odds
- **Position bonus**: Players acting later get a small strength bonus (information advantage)
- **Board texture reading**: Detect scary boards (flush/straight possible) and adjust strength down
- **Variable raise sizing**: Base raises on pot size (1/2 pot, 3/4 pot, pot-size) instead of fixed BB multiples
- **Tighter all-in thresholds**: Require stronger hands for large commitments relative to stack

### C. Implementation
**Files**:
- `src/lib/poker/bot-ai.ts` -- Add personality types, position awareness, pot odds, variable sizing
- `src/hooks/usePokerGame.ts` -- Assign random personalities to bots on game start, pass personality to `decideBotAction`
- `src/lib/poker/types.ts` -- Add `personality` field to `PokerPlayer`

---

## 4. Tournament System Analysis

**Current state**: The tournament system has full backend infrastructure:
- `poker-create-tournament`: Creates tournament with blind structure, registration
- `poker-register-tournament`: Handles player registration with invite codes
- `poker-start-tournament`: Seats players round-robin across tables, sets status to 'running'
- `poker-tournament-state`: Aggregates state (players, tables, blinds, timer)
- `poker-tournament-eliminate`: Tracks eliminations, handles table balancing/merging
- `poker-tournament-advance-level`: Manages blind level progression

**The "Start Tournament" button exists** (line 351 in TournamentLobby) and calls `handleStart` which invokes `poker-start-tournament`. After starting, a "Go to My Table" button appears (line 357) that calls `onJoinTable(detail.my_table_id)` which renders `OnlinePokerTable`.

**So the flow works**: Create -> Register -> Start -> Go to My Table -> Play at `OnlinePokerTable`. The tournament creates actual poker tables and assigns players. The user then plays regular online poker hands at their assigned table.

**What may be confusing**: After clicking "Start Tournament", the user needs to click "Go to My Table" as a second step. We could auto-navigate to the table after starting.

**Improvement**: Auto-navigate to the player's table after starting the tournament, removing the extra click.

**File**: `src/components/poker/TournamentLobby.tsx` -- In `handleStart`, after successful start, auto-fetch detail and navigate to `my_table_id`.

---

## Summary of Changes

| # | Change | File(s) |
|---|--------|---------|
| 1 | Hide bottom nav in online poker game | `src/components/poker/OnlinePokerTable.tsx` |
| 2 | No changes needed (rules are correct) | -- |
| 3 | Bot personality system + smarter AI | `src/lib/poker/bot-ai.ts`, `src/lib/poker/types.ts`, `src/hooks/usePokerGame.ts` |
| 4 | Auto-navigate to table after tournament start | `src/components/poker/TournamentLobby.tsx` |

## Technical Details

### Bot Personality Types
```text
Shark:  foldThreshold=50, raiseThreshold=70, bluffChance=0.05, raiseSizing=1.0x pot
Maniac: foldThreshold=25, raiseThreshold=45, bluffChance=0.20, raiseSizing=1.5x pot  
Rock:   foldThreshold=60, raiseThreshold=85, bluffChance=0.02, raiseSizing=0.5x pot
Fish:   foldThreshold=55, raiseThreshold=90, bluffChance=0.03, raiseSizing=0.6x pot
Pro:    foldThreshold=40, raiseThreshold=65, bluffChance=0.10, raiseSizing=0.75x pot (+ pot odds)
```

### Bot Names with Personalities
Each bot gets a randomly assigned personality. The bot name stays the same but their play style varies, creating diverse table dynamics. Personality is stored on the `PokerPlayer` type.

### Position Awareness (Pro personality)
Seats closer to the dealer button (later position) get a +5 to +10 strength bonus, simulating the information advantage of acting last.
