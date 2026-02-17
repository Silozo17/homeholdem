

# Production Polish Sprint: Multiplayer Poker -- Mobile Landscape First

Sequential execution: P0 (correctness) -> P1 (landscape layout) -> P2+M (cleanup + hardening). Each stage verified with screenshots on iPhone 12, iPhone 16, and Android landscape viewports.

No changes to multiplayer architecture (broadcast + HTTP hole cards + optimistic versioning).

---

## P0 -- Correctness (Must-Fix)

### P0.1 Fix runout delay logic

**File**: `src/hooks/useOnlinePokerTable.ts`

**Current bug** (lines 265-270): The `isRunout` check uses `hasRevealedCards && incomingCommunityCount >= 5`. Since `revealed_cards` is present at *every* showdown (not just all-in runouts), the 4-second delay fires on normal hands too, making all showdowns feel sluggish.

**Fix**:
- Add a new ref `prevCommunityAtResultRef = useRef(0)` alongside the existing refs (after line 91)
- In the `game_state` handler (around line 194, inside setTableState), update: `prevCommunityAtResultRef.current = payload.community_cards?.length ?? 0`
- In the `hand_result` handler (line 265), replace the current detection:

```typescript
const incomingCount = (payload.community_cards || []).length;
const wasRunout = prevCommunityAtResultRef.current < 5 && incomingCount === 5;
const winnerDelay = wasRunout ? 4000 : 0;
```

- Reset `prevCommunityAtResultRef.current = 0` in the hand_id change effect (line 123-131)

### P0.2 Fix WinnerOverlay time units

**File**: `src/components/poker/WinnerOverlay.tsx`

**Current bug** (lines 37-41): `formatTime` divides by 60000 (milliseconds) but the caller at `OnlinePokerTable.tsx` line 960 passes seconds via `Math.floor((Date.now() - gameStartTimeRef.current) / 1000)`.

**Fix**: Replace lines 37-41:
```typescript
const formatTime = (secs: number) => {
  const mins = Math.floor(secs / 60);
  const s = secs % 60;
  return `${mins}m ${s}s`;
};
```

### P0.3 Prevent negative deal delays

**File**: `src/components/poker/OnlinePokerTable.tsx` (line 1077)

**Current bug**: `activeScreenPositions.indexOf(screenPos)` returns -1 for mid-hand joiners, causing negative animation delays.

**Fix** at line 1077:
```typescript
const idx = activeScreenPositions.indexOf(screenPos);
const seatDealOrder = Math.max(0, idx);
const disableDealAnim = idx < 0;
```

Pass `disableDealAnim` as a new prop to `PlayerSeat`.

**File**: `src/components/poker/PlayerSeat.tsx`

Add `disableDealAnim?: boolean` prop. When true, skip the reveal delay logic and show cards immediately (set all indices revealed at time 0).

---

## P1 -- Landscape Layout (Main UX Pain)

### P1.1 Betting controls must NEVER overlap seats

**Files**: `src/components/poker/OnlinePokerTable.tsx`, `src/components/poker/BettingControls.tsx`

**Current problem** (line 877): Table uses `width: min(79vw, 990px)` regardless of betting panel. The 160px panel at line 1113 is absolutely positioned and overlaps right-side seats on iPhone 12 (844px viewport).

**Fix**: Replace the current absolute-positioned layout with a CSS Grid when betting is active in landscape:

In `OnlinePokerTable.tsx`, wrap the table scene and betting panel in a grid container:
```tsx
<div className="absolute inset-0 flex items-center justify-center" style={{ zIndex: Z.TABLE }}>
  <div className="w-full h-full"
    style={{
      display: isMobileLandscape && showActions ? 'grid' : 'flex',
      gridTemplateColumns: isMobileLandscape && showActions
        ? `1fr ${panelW}px` : undefined,
      alignItems: 'center',
      justifyContent: 'center',
    }}
  >
    {/* Table column */}
    <div className="relative" style={{ ... }}>
      ...table wrapper (aspect-ratio: 16/9, flex: 1)...
    </div>
    {/* Betting panel column -- only in grid mode */}
  </div>
</div>
```

Where `panelW = window.innerWidth < 900 ? 130 : 160`.

Move the landscape betting controls from line 1113 into this grid's second column instead of absolute positioning.

**BettingControls.tsx**: Replace hardcoded `w-[160px]` at line 71 with a prop-driven width class.

### P1.2 Header must not overflow

**File**: `src/components/poker/OnlinePokerTable.tsx` (lines 754-868)

**Current problem**: 8-9 buttons in the header overflow on narrow landscape screens.

**Fix**: When `isMobileLandscape`, collapse non-essential buttons into a three-dot menu:
- **Always visible**: Back, table name/blinds, hand #, sound toggle
- **In three-dot menu**: History, Copy code, Invite, Voice toggle, QuickChat

Apply `padding-top: calc(env(safe-area-inset-top) + 8px)` (already close at line 758 but uses `+ 10px`; fine as-is).

### P1.3 Community deal sprite landing position

**File**: `src/components/poker/OnlinePokerTable.tsx` (line 1017)

**Current problem**: `--deal-center-dy` hardcoded to `'46cqh'` but community cards sit at `top: '44%'` (line 896). The 2% offset causes a visible jump.

**Fix**: Add `communityRef` and `tableWrapperRef`. On render (via a layout effect), compute the community card container's center relative to the table wrapper and set CSS vars dynamically:

```typescript
const tableWrapperRef = useRef<HTMLDivElement>(null);
const communityRef = useRef<HTMLDivElement>(null);
const [commCenterY, setCommCenterY] = useState('44cqh');

useEffect(() => {
  const update = () => {
    const wrapper = tableWrapperRef.current?.getBoundingClientRect();
    const comm = communityRef.current?.getBoundingClientRect();
    if (wrapper && comm && wrapper.height > 0) {
      const cy = ((comm.top + comm.height / 2) - wrapper.top) / wrapper.height * 100;
      setCommCenterY(`${cy.toFixed(1)}cqh`);
    }
  };
  update();
  window.addEventListener('resize', update);
  return () => window.removeEventListener('resize', update);
}, []);
```

Then use `commCenterY` for `--deal-center-dy` at line 1017 instead of the hardcoded `'46cqh'`.

### P1.4 HandReplay must open from right in landscape

**File**: `src/components/poker/HandReplay.tsx`

**Current problem** (line 68): `side="bottom"` with `max-h-[70vh]` = only 273px in landscape, pushing controls off-screen.

**Fix**: Accept `isLandscape` prop. Render conditionally:
- Landscape: `side="right"` with `className="w-[320px] h-full"` and remove `max-h-[70vh]`
- Portrait: keep current `side="bottom"` with `max-h-[70vh]`

Pass `isLandscape` from `OnlinePokerTable.tsx` line 1186.

---

## P2 -- Performance and Cleanup

### P2.1 Remove dead `isFolded`

**File**: `src/components/poker/PlayerSeat.tsx` line 39

Remove `const isFolded = player.status === 'folded';` -- unused variable.

### P2.2 Rename duplicate `prevHandIdRef`

**File**: `src/components/poker/OnlinePokerTable.tsx` line 144

Rename to `prevAnimHandIdRef` to distinguish from the same-named ref in `useOnlinePokerTable.ts`. Update all references in OnlinePokerTable (lines 550, 553, 556).

### P2.3 Simplify card fan offset calc

**File**: `src/components/poker/PlayerSeat.tsx` line 108

Replace `compact ? 'calc(-30% + 40px)' : 'calc(-25% + 40px)'` with a single tested value: `'calc(-28% + 40px)'`.

### P2.4 lastActions reprocessing

**File**: `src/components/poker/OnlinePokerTable.tsx` (lines 257-273, 359-367)

Two `useEffect` hooks re-iterate all `lastActions` entries on every update.

**Fix**: Add `processedActionsRef = useRef(new Set<string>())`. Generate a unique key per action entry (e.g., `${playerId}:${actionStr}:${hand?.hand_id}`). Skip already-processed keys. Clear the set on new `hand_id`.

### P2.5 Stabilize rotatedSeats memo

**File**: `src/components/poker/OnlinePokerTable.tsx` (lines 602-608)

`seats` is a new array reference on every broadcast, causing unnecessary recalculations.

**Fix**: Derive a stable `seatsKey`:
```typescript
const seatsKey = seats.map(s =>
  `${s.seat}|${s.player_id}|${s.status}|${s.stack}|${s.current_bet}`
).join(';');
```

Store seats in a ref, memo on `seatsKey`:
```typescript
const seatsRef = useRef(seats);
seatsRef.current = seats;
const rotatedSeats = useMemo(() => {
  const s = seatsRef.current;
  return Array.from({ length: maxSeats }, (_, i) => {
    const actualSeat = (heroSeat + i) % maxSeats;
    return s.find(seat => seat.seat === actualSeat) || null;
  });
}, [seatsKey, maxSeats, heroSeat]);
```

---

## Missing Checks (M1-M4)

### M1 Debug overlay for table wrapper bounds + seat labels

**File**: `src/components/poker/DebugOverlay.tsx`

Extend to also draw:
- The table wrapper bounding rectangle (100x100 viewBox outline)
- Each seat's xPct/yPct as text labels next to the anchor dots
- Panel width indicator when betting is active

**File**: `src/components/poker/OnlinePokerTable.tsx`

Enable via `?debug=1` query parameter. Add inside the table wrapper div, gated behind `new URLSearchParams(window.location.search).get('debug') === '1'`.

### M2 Ignore out-of-order broadcasts by state_version

**File**: `src/hooks/useOnlinePokerTable.ts`

Add `lastAppliedVersionRef = useRef(0)`.

In the `game_state` handler (line 169):
- If new `hand_id` differs from current: reset `lastAppliedVersionRef.current = 0`
- If `payload.state_version <= lastAppliedVersionRef.current` and same hand_id: skip the update
- Otherwise: apply and set `lastAppliedVersionRef.current = payload.state_version`

### M3 Reconnect sets lastAppliedVersionRef

**File**: `src/hooks/useOnlinePokerTable.ts`

In `refreshState` (line 143), after setting tableState from snapshot:
```typescript
lastAppliedVersionRef.current = data.current_hand?.state_version ?? 0;
```

### M4 Ensure channel cleanup on tableId change

**File**: `src/hooks/useOnlinePokerTable.ts`

The subscribe effect (line 165) already has `tableId` in its dependency array and the cleanup calls `supabase.removeChannel(channel)`. This is correct. Add a guard at the top of the effect to clean up any stale channel from the ref:

```typescript
if (channelRef.current) {
  supabase.removeChannel(channelRef.current);
  channelRef.current = null;
}
```

---

## File Change Summary

| File | Changes |
|------|---------|
| `src/hooks/useOnlinePokerTable.ts` | P0.1 (runout ref), M2 (state_version guard), M3 (reconnect version), M4 (channel cleanup guard) |
| `src/components/poker/WinnerOverlay.tsx` | P0.2 (formatTime fix) |
| `src/components/poker/OnlinePokerTable.tsx` | P0.3 (clamp seatDealOrder), P1.1 (grid layout), P1.2 (header collapse), P1.3 (community ref), P2.2 (rename ref), P2.4 (processedActionsRef), P2.5 (seatsKey memo), M1 (debug overlay) |
| `src/components/poker/BettingControls.tsx` | P1.1 (dynamic width) |
| `src/components/poker/HandReplay.tsx` | P1.4 (side="right" in landscape) |
| `src/components/poker/PlayerSeat.tsx` | P0.3 (disableDealAnim prop), P2.1 (remove isFolded), P2.3 (simplify card fan) |
| `src/components/poker/DebugOverlay.tsx` | M1 (table wrapper bounds + seat labels) |

## Execution Order

1. **P0.1 + P0.2 + P0.3** -- correctness fixes, then screenshots
2. **P1.1 + P1.2 + P1.3 + P1.4** -- landscape layout, then screenshots
3. **P2.1-P2.5 + M1-M4** -- cleanup + hardening, then final screenshots + checklist

