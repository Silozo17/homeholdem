

# Stage 5 Cleanup, Sanitization & Feature Guide

## Part 1: Code Cleanup

### 1.1 Remove dead code in `OnlinePokerTable.tsx`

| Line | Issue | Fix |
|------|-------|-----|
| 27 | `Input` imported but never used | Remove import |
| 29 | `LogOut` imported but never used | Remove from icon import list |
| 92 | `_keepHookOrder` state — artificial placeholder after `isDisconnected` removal | Remove entirely (hooks after it maintain stable order regardless) |

### 1.2 Expose `exportCSV` from hand history to the UI

`useHandHistory` returns `exportCSV` but `OnlinePokerTable` never destructures it. Two options:

- **Option A (chosen):** Add a "Download CSV" button inside `HandReplay.tsx` so users can export the last hand's data from the replay sheet. This requires passing `handHistory` (the full array) or `exportCSV` callback down.
- Wire it: destructure `exportCSV` from `useHandHistory` in `OnlinePokerTable`, pass it as a prop to `HandReplay`.

### 1.3 Minor type safety

- `handleAction` in `OnlinePokerTable` accepts `any` — tighten to `{ type: string; amount?: number }`.

---

## Part 2: Strengthen & Harden

### 2.1 `PeekableCard` — prevent scroll interference

Touch drag on the card currently doesn't call `preventDefault()` on `touchmove`, which can cause the page to scroll on some browsers. Add `e.preventDefault()` in `handleTouchMove` and set `{ passive: false }` via a `useEffect` event listener instead of React's synthetic handler (React marks touch handlers as passive by default).

### 2.2 `HandReplay` — reset step on open

When `HandReplay` opens, `step` retains its value from the previous viewing. Add a `useEffect` to reset `step` to `0` and `showAll` to `false` when `open` transitions to `true`.

### 2.3 `ConnectionOverlay` — cleanup auto-reconnect on status change

The current `useEffect` for auto-reconnect correctly clears timers on unmount but the `attempts` counter can drift if `status` flickers between `reconnecting` and `disconnected`. Add a guard: only increment attempts when the timer actually fires, and reset attempts to 0 immediately when status becomes `connected`.

This is already mostly correct in the current code. No change needed after review.

### 2.4 `PreActionButtons` — add haptic feedback

When a pre-action button is toggled, add a light haptic tap for confirmation. Pass `haptic` from `OnlinePokerTable` or use `navigator.vibrate([30])` inline.

---

## Part 3: Summary of Changes

| File | Action |
|------|--------|
| `OnlinePokerTable.tsx` | Remove unused `Input` import, `LogOut` icon, `_keepHookOrder` state. Type-tighten `handleAction`. Destructure and pass `exportCSV` to `HandReplay`. |
| `HandReplay.tsx` | Add CSV export button. Reset `step`/`showAll` on open. Accept `onExportCSV` prop. |
| `PeekableCard.tsx` | Fix touch scroll interference with non-passive `touchmove` listener. |
| `PreActionButtons.tsx` | Add light vibration on toggle. |

---

## Part 4: Where to Find & Use Each New Feature

Here is a guide to all features added in Stages 1--5:

### Pre-Action Buttons (Stage 2.1)
- **Where:** During an online multiplayer hand, when it is NOT your turn
- **How:** Three small pill buttons appear at the bottom of the screen: "Check/Fold", "Call Any", "Check"
- **Usage:** Tap one to queue an action. It highlights gold. When your turn arrives, the action fires automatically. Tap again to cancel.

### Pot Odds Display (Stage 2.2)
- **Where:** During your turn in multiplayer, when facing a bet
- **How:** A small info line appears just below the pot total showing "X to win Y" and "Need Z% equity"
- **Usage:** Purely informational — helps you decide whether to call

### Enhanced Emote Reactions (Stage 2.3)
- **Where:** Tap the chat bubble icon in the table header bar
- **How:** A popover grid of 8 emoji reactions + 6 quick text messages. Recently used emojis appear at the top.
- **Usage:** Tap any emoji/message to send it. Single emojis float as large animated bubbles; text appears as chat pills.

### Card Peek / Squeeze (Stage 3.1)
- **Where:** When you are dealt cards in multiplayer, your hole cards start face-down
- **How:** Drag upward on your cards to "peek" — the card tilts and reveals from the bottom like a real squeeze
- **Usage:** Drag past 65% to permanently reveal. A one-time "Drag to peek" hint appears on first use.

### Achievement System (Stage 4.1)
- **Where:** Achievements trigger automatically during multiplayer play
- **How:** A rarity-styled toast (silver/blue/purple/gold) appears at the top of the table when you unlock one
- **Examples:** Win your first hand (First Blood), hit a Royal Flush, win 5 in a row (On Fire), double your stack
- **Persistence:** Stored in localStorage. 20 achievements available across Common, Rare, Epic, and Legendary tiers.

### Hand History & Replay (Stage 4.2)
- **Where:** After at least one hand completes, a clock/history icon appears in the top-right header bar
- **How:** Tap it to open a bottom sheet showing a step-by-step replay of the last hand
- **Usage:** Use Prev/Next to step through actions, or "Show All" for the full timeline. Community cards and winners display contextually. CSV export button (being added in this cleanup).

### Offline Hand Cache (Stage 5.1)
- **Where:** Automatic — hands are cached in localStorage per table
- **How:** Up to 20 hands stored per table, up to 5 tables total. Oldest tables are pruned automatically.
- **Usage:** Hand history persists even if you close the browser and return later.

### Smart Reconnection (Stage 5.2)
- **Where:** Appears automatically when your connection drops during multiplayer
- **How:** A full-screen overlay shows connection status, attempt progress (6 attempts with exponential backoff: 2s to 30s), and context about the current hand
- **Usage:** Wait for auto-reconnect, or tap "Reconnect" manually. On success, a green "Reconnected!" flash confirms recovery.

