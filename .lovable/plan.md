

# Poker Table Improvements

Four changes to the online poker table experience.

## 1. Leave Seat (Spectate) vs Leave Table

Currently there is only one "leave" action that removes the player from the table entirely. We need two separate actions:

- **Leave Seat**: Player gives up their seat but stays at the table as a spectator. They can rejoin an empty seat later.
- **Leave Table**: Player exits the table completely and navigates away.

### Implementation
- **`src/hooks/useOnlinePokerTable.ts`**: Add a `leaveSeat()` function that calls the existing `poker-leave-table` edge function but does NOT navigate away. After leaving, `mySeatNumber` becomes `null` and the player becomes a spectator. The existing `leaveTable()` calls `leaveSeat()` internally then triggers navigation.
- **`src/components/poker/OnlinePokerTable.tsx`**:
  - Add state `showLeaveSeatConfirm` for the seat-exit confirmation dialog.
  - Replace the single back button (ArrowLeft) with two buttons:
    - A `DoorOpen` (lucide) icon for "Leave Table" (navigates away).
    - A `UserMinus` (lucide) icon for "Leave Seat" (become spectator).
  - Both buttons show a confirmation dialog before executing.
  - When spectating (no seat), the "Leave Seat" button is hidden or disabled, and only the "Leave Table" door icon shows.

## 2. Fix Hand History (HandReplay) Freezing Controls

The `HandReplay` component uses a `Sheet` component. When the sheet opens, it likely traps focus and intercepts pointer events, freezing the game controls underneath.

### Root Cause
The `Sheet` (built on Radix Dialog) uses a modal overlay that blocks interaction with the rest of the page. The `HandHistory` component (fixed bottom panel) is imported but never rendered.

### Fix
- **`src/components/poker/HandReplay.tsx`**: Add `modal={false}` to the `Sheet` component so it doesn't create a blocking overlay. This allows the game controls to remain interactive while the history panel is open.
- Alternatively, if `modal={false}` is insufficient, switch to a non-modal approach: render the hand replay as a collapsible panel (similar to `HandHistory`) instead of a sheet, or ensure the sheet's overlay doesn't block z-index layers above it.

## 3. Expanded QuickChat with 20+ Presets and Scroll

Current state: 8 emoji reactions + 6 text messages = 14 items. Top 3 recent emojis tracked.

### Changes to `src/components/poker/QuickChat.tsx`:
- Expand to ~28 total items:
  - **Emojis (12)**: Keep existing 8, add: `{ emoji: '💀', label: 'Dead' }`, `{ emoji: '🤑', label: 'Money' }`, `{ emoji: '🫣', label: 'Peeking' }`, `{ emoji: '🤡', label: 'Clown' }`
  - **Messages (20)**: Keep existing 6, add 14 more poker phrases across categories:
    - Playful: "Ship it!", "You're bluffing!", "I knew it!", "Slow roll much?"
    - Fun: "Donkey!", "Fish on!", "Run it twice?", "That's poker baby"
    - Competitive: "All day!", "Come at me", "Easy game", "Pay me"
    - Classic: "Wow", "Brutal"
- **Top 5 Most Used**: Change the tracking from `recent emojis only (top 3)` to `all items (emoji + text), top 5`, stored by usage count not recency. Rename localStorage key to `poker-chat-freq`.
- **Scrollable container**: Keep the popover at `w-64` and add `max-h-[280px] overflow-y-auto` to the inner content so all items are accessible via scroll. The "Top 5" section stays pinned at the top (outside the scroll area).

## 4. Header Buttons: Door Exit + Seat Exit Icons

### Changes to `src/components/poker/OnlinePokerTable.tsx`:
- Import `DoorOpen` and `UserMinus` from lucide-react (remove `ArrowLeft` import).
- Replace the single back button with two side-by-side buttons:
  - `DoorOpen` icon button: triggers `showQuitConfirm` (leave table entirely).
  - `UserMinus` icon button: triggers `showLeaveSeatConfirm` (leave seat, become spectator). Only visible when seated.
- **Two confirmation dialogs**:
  - "Leave Table?" dialog (existing, update text): "You will leave the table completely."
  - "Leave Seat?" dialog (new): "You will become a spectator. You can rejoin an empty seat later."

## Files Changed

| File | Change |
|------|--------|
| `src/hooks/useOnlinePokerTable.ts` | Add `leaveSeat()` function, export it |
| `src/components/poker/OnlinePokerTable.tsx` | Two header buttons with confirmation dialogs, leaveSeat integration, icon swaps |
| `src/components/poker/QuickChat.tsx` | 12 emojis, 20 messages, frequency-based top 5, scrollable container |
| `src/components/poker/HandReplay.tsx` | Add `modal={false}` to Sheet to prevent control freezing |

## NOT Changed
- Edge functions, server logic, bottom navigation, layout, logo, card animations, seat positions

