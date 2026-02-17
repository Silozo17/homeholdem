

# Add Game State Debug Inspector for "Testing" Table

## What This Does

Adds a collapsible debug panel that automatically appears when playing at a table named "Testing". It shows live server state in real-time -- hand phase, pots, current actor, seat data, action deadline countdown, state version, connection status, and more. Useful for diagnosing game issues without needing browser dev tools.

## Changes

### 1. New Component: `src/components/poker/GameStateDebugPanel.tsx`

A semi-transparent overlay panel (top-right corner, collapsible) showing:

- **Table**: name, status, blinds, blind level, blind timer
- **Hand**: hand_id (short), hand_number, phase, state_version, dealer/SB/BB seats
- **Actor**: current_actor_seat, action_deadline with live countdown, min_raise, current_bet
- **Pots**: each pot amount and eligible player count
- **Seats**: seat number, player name (truncated), stack, status, current_bet, last_action, has_cards
- **Client State**: mySeatNumber, isMyTurn, amountToCall, canCheck, actionPending, connectionStatus, isAutoStartLeader
- **My Cards**: raw card data

The panel has a small toggle button (bug icon) to collapse/expand. Auto-updates every render since it reads from existing state.

### 2. Update `src/components/poker/OnlinePokerTable.tsx`

- Import and render `GameStateDebugPanel` conditionally when `tableState?.table?.name === 'Testing'`
- Pass all relevant state: `tableState`, `myCards`, `mySeatNumber`, `isMyTurn`, `amountToCall`, `canCheck`, `actionPending`, `connectionStatus`
- No other changes to the component

## Technical Details

- Panel uses `position: fixed` top-right with `z-index: 1000`, `pointer-events: auto` on the panel itself
- Monospace font, small text (9-10px), dark semi-transparent background
- Collapsed state shows just the bug icon button
- No database, edge function, or schema changes
- Only visible on tables named exactly "Testing"
