

# Fix: 4 Online Poker Issues

## Issue 1: Table Shifts Right When Action Buttons Appear

**Root cause**: In mobile landscape, the layout switches from `flex` (centered) to `grid` with `1fr ${panelW}px` columns when `showActions` becomes true (line 930). This re-allocates space, pushing the table left and creating the visual shift.

**Fix**: Stop using `useGrid` to toggle between flex and grid. Instead, always use absolute positioning for the betting panel (overlay it on the right side), keeping the table centered at all times. The betting controls already render as an absolute overlay in non-mobile-landscape modes -- apply the same pattern for mobile landscape.

**Files**: `src/components/poker/OnlinePokerTable.tsx`
- Remove `useGrid` variable and the grid layout logic (lines 929-939)
- Always use `flex` + centered table
- Render the landscape betting panel as an `absolute` positioned sidebar overlaying the table area on the right

---

## Issue 2: Raise Menu Too Narrow in Landscape

**Root cause**: The landscape betting panel width is hardcoded to 130-160px (line 929/72). Quick bet buttons and the slider are crammed into this narrow space.

**Fix**: Widen the landscape panel to 180px minimum (up to 200px on wider screens). Also increase the quick bet button text size and slider thumb area for better touch targets.

**Files**: `src/components/poker/BettingControls.tsx`
- Increase default landscape `panelWidth` from 160px to 180px
- Quick bet buttons: increase from `text-[10px]` to `text-[11px]`, add more padding
- Slider: ensure minimum thumb size of 28px for touch

`src/components/poker/OnlinePokerTable.tsx`
- Update panelW calculation from `130/160` to `160/200`

---

## Issue 3: Chat Messages Disappeared

**Root cause**: In the `isMobileLandscape` branch (lines 817-853), the `QuickChat` component is NOT rendered -- it only exists in the non-mobile-landscape branch (line 870). So on mobile landscape (which is the primary play mode), users cannot send chat messages at all.

**Fix**: Add `QuickChat` to the mobile landscape dropdown menu as a nested component, OR render it separately as an always-visible button in the header bar for mobile landscape too.

Better approach: render the `QuickChat` button in the header alongside the sound toggle (before the three-dot menu) for both mobile landscape and desktop. This ensures chat is always one tap away.

**Files**: `src/components/poker/OnlinePokerTable.tsx`
- Move `<QuickChat onSend={trackedSendChat} />` to render BEFORE the `isMobileLandscape` conditional branch, so it appears in the header bar regardless of orientation

---

## Issue 4: Wrong Hand Winning

**Root cause investigation**: The server-side hand evaluator in `poker-action/index.ts` is a direct port of the client-side evaluator and appears logically correct. The showdown logic correctly fetches all hole cards, filters out folded players, evaluates 7-card hands, and distributes pots by score. Without the specific hand ID from the Kris vs Amir game, the exact bug cannot be reproduced from data alone.

However, there is one potential issue: the `has_acted_this_round` reset logic for the **current betting round** may cause an edge case where a player's status is incorrectly computed when transitioning phases. Specifically, the `currentRoundBet` calculation at line 256 only sums actions matching `hand.phase`, but by the time showdown is reached, `hand.phase` has been updated to `showdown` -- meaning all phase-specific bet tracking resets to zero.

**Defensive fix**: Add server-side logging of hand evaluation details (each player's hole cards, the community cards, their evaluated hand name and score) to the `results` object stored in `poker_hands`. This way:
1. Any disputed hand can be audited from the database
2. If the evaluator has a subtle bug, the logged data will expose it

Additionally, add a safety check: log a warning when two players have identical scores but different hand names (indicating a potential scoring collision).

**Files**: `supabase/functions/poker-action/index.ts`
- In the showdown block (lines 447-462), log each player's evaluated hand to console
- Store `hand_details` (player_id, hole cards, hand name, score) in the results object for auditability

---

## Summary of Changes

| File | Change |
|------|--------|
| `src/components/poker/OnlinePokerTable.tsx` | Remove grid layout toggle; use absolute overlay for betting panel; move QuickChat to always-visible header position |
| `src/components/poker/BettingControls.tsx` | Widen landscape panel (180-200px); improve quick bet button sizing |
| `supabase/functions/poker-action/index.ts` | Add hand evaluation audit logging to results object for showdown hands |

