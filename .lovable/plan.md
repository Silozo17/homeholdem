# Extract usePokerBroadcast and usePokerConnection from useOnlinePokerTable

This refactor splits the 988-line `useOnlinePokerTable.ts` into three files while keeping the public API identical. `OnlinePokerTable.tsx` will not be modified.

## Step 1: Create `src/hooks/usePokerBroadcast.ts`

**State owned (6)**:

- `revealedCards`, `handWinners`, `lastActions`, `chatBubbles`, `actionPending`, `kickedForInactivity`

**Refs owned (12)**:

- `showdownTimerRef`, `winnerTimerRef`, `actionPendingFallbackRef`, `chatIdCounter`, `chatBubbleTimers`, `prevCommunityAtResultRef`, `lastAppliedVersionRef`, `pendingWinnersRef`, `runoutCompleteTimeRef`, `preResultStacksRef`, `lastBroadcastRef`, `prevHandIdRef`

**Additional ref (new)**: `handWinnersRef` -- mirrors `handWinners` state to avoid closing over state in the broadcast handler. Replaces the direct `handWinners.length > 0` read at line 393.

**Ref moved from parent**: `lastActedVersionRef` -- written by `markActionSent()`, read by broadcast handlers.

**Parameters received**:

- `userId`, `tableStateRef`, `setTableState`, `setMyCards`, `setAutoStartAttempted`, `setConnectionStatus`, `refreshState`, `gameOverPendingRef`, `blindsUpCallbackRef`

**Functions exposed**:

- `buildBroadcastHandlers()` -- returns the handler config objects for channel `.on()` calls
- `resetBroadcastState()` -- clears all state/refs including `clearTimeout` on both timer refs before nulling
- `markActionSent(version: number)` -- sets `lastActedVersionRef`, `actionPending`, starts fallback timer
- `scheduleBubbleRemoval(id)` -- for external use by `sendChat`
- `setChatBubbles` -- for external use by `sendChat`

**Effect moved into this hook**: The hand_id change effect (lines 138-150) that resets `lastActions`, `lastActedVersionRef`, `prevHandIdRef`, `prevCommunityAtResultRef`, `pendingWinnersRef`, `runoutCompleteTimeRef`. Receives `handId: string | null` as a derived value from parent.

**Key fix**: Line 393 changes from `handWinners.length > 0` to `handWinnersRef.current.length > 0`. A sync effect keeps `handWinnersRef.current = handWinners` whenever state changes.

---

## Step 2: Create `src/hooks/usePokerConnection.ts`

**State owned (3)**:

- `connectionStatus`, `spectatorCount`, `onlinePlayerIds`

**Refs owned (2)**:

- `channelRef`, `hasSubscribedOnceRef`

**Parameters received**:

- `tableId`, `userId`, `tableStateRef`, `refreshState`, `broadcastHandlers` (from `buildBroadcastHandlers()`)

**Values returned**:

- `connectionStatus`, `spectatorCount`, `onlinePlayerIds`, `channelRef`

**Logic**: Creates the Supabase channel, attaches broadcast handlers from the parameter, attaches presence sync handler (owns spectatorCount/onlinePlayerIds), subscribes, handles SUBSCRIBED/CHANNEL_ERROR/TIMED_OUT/CLOSED status, reconnect via `hasSubscribedOnceRef`, cleanup on unmount.

---

## Step 3: Update `src/hooks/useOnlinePokerTable.ts`

**Compose both hooks**:

```text
const broadcast = usePokerBroadcast({ userId, tableStateRef, setTableState, ... });
const connection = usePokerConnection({
  tableId, userId, tableStateRef, refreshState,
  broadcastHandlers: broadcast.buildBroadcastHandlers()
});
```

**State remaining in parent (7)**: `tableState`, `myCards`, `loading`, `error`, `autoStartAttempted`, `handHasEverStarted`, `lastKnownPhase`/`lastKnownStack`

**Refs remaining in parent (5)**: `tableStateRef`, `startHandRef`, `blindsUpCallbackRef`, `timeoutTimerRef`, `timeoutPollRef`, `lastRefreshRef`, `gameOverPendingRef`

**Functions remaining in parent**: `refreshState`, `joinTable`, `leaveSeat`, `leaveTable`, `startHand`, `sendAction`, `pingTimeout`, `sendChat`, `resetForNewGame`, `onBlindsUp`

`**resetForNewGame` updated**: Calls `broadcast.resetBroadcastState()` instead of directly clearing broadcast-owned refs/state. Still clears parent-owned state (`myCards`, `autoStartAttempted`, `handHasEverStarted`).

`**sendAction` updated**: Calls `broadcast.markActionSent(version)` instead of directly setting `lastActedVersionRef` and `actionPending`.

`**sendChat` updated**: Uses `connection.channelRef` and `broadcast.setChatBubbles` + `broadcast.scheduleBubbleRemoval`.

**Return object**: Identical shape -- same 27 properties, same types. Values sourced from `broadcast.*` and `connection.*` instead of local state.

---

## Constraints enforced

- `OnlinePokerTable.tsx` is NOT modified
- Return type of `useOnlinePokerTable` is identical (verified against lines 951-987)
- No timing or behaviour changes -- handler logic is moved verbatim
- `buildBroadcastHandlers` is stabilized with `useCallback` + ref-based reads to prevent channel recreation on renders

Implement the extraction plan exactly as described in the three steps above. Follow this sequence strictly — do not move to the next step until the current step compiles without errors.

Step 1 first: Create src/hooks/usePokerBroadcast.ts

Step 2: Create src/hooks/usePokerConnection.ts

Step 3: Update src/hooks/useOnlinePokerTable.ts to compose both hooks

Hard constraints — if any of these cannot be met, stop and report before continuing:

	∙	OnlinePokerTable.tsx is not modified under any circumstances

	∙	The return type of useOnlinePokerTable is identical — same 27 properties, same names, same types

	∙	buildBroadcastHandlers must use useCallback with an empty or stable dependency array and must read all state exclusively through refs — never closing over state variables directly. This is non-negotiable — if handlers close over state the channel will reconnect on every render

	∙	resetBroadcastState() must call clearTimeout before nulling both timer refs — not just null them

	∙	No behaviour changes — all timing, state updates, and broadcast handling must be identical to the current implementation

After completing all three steps, show me the final line counts for all three files.​​​​​​​​​​​​​​​​

---

## File summary


| File                                        | Action                           | Approx lines |
| ------------------------------------------- | -------------------------------- | ------------ |
| `src/hooks/usePokerBroadcast.ts`            | Create                           | ~350         |
| `src/hooks/usePokerConnection.ts`           | Create                           | ~120         |
| `src/hooks/useOnlinePokerTable.ts`          | Modify (reduce from 988 to ~520) | ~520         |
| `src/components/poker/OnlinePokerTable.tsx` | No change                        | --           |
