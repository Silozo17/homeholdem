

## Mobile Poker Enhancements -- Full Implementation Plan

12 features organized into 5 stages, from easiest to hardest.

### ✅ Stage 1: COMPLETE

---

### Stage 1: Quick Wins (CSS/state-only, no backend)

#### 1.1 -- Haptic Feedback System

Expand the existing haptic vibration (currently only on "your turn" and action button press) into a comprehensive system.

**File: `src/hooks/usePokerSounds.ts`**
- Add a `haptic` function alongside `play` that maps events to vibration patterns
- Patterns:
  - `fold`: 30ms single buzz (mistake/dismissal feel)
  - `call`: 40ms single tap
  - `raise`: [40, 30, 60] escalating double-tap
  - `check`: [20, 20] light double-tap
  - `all-in`: [100, 50, 100, 50, 200] dramatic escalation
  - `win`: [50, 30, 50, 30, 50, 30, 100] celebration cascade
  - `cardReveal`: 25ms micro-tap (for each community card)
  - `deal`: [15, 40, 15] shuffle feel
- Return `haptic` from the hook alongside `play`

**File: `src/components/poker/OnlinePokerTable.tsx`**
- Destructure `haptic` from `usePokerSounds()`
- Add haptic calls to:
  - `handleAction`: call `haptic(action.type)` (already has basic vibrate, replace with new patterns)
  - Community card reveals in the staged runout effect: `haptic('cardReveal')` per card
  - Winner detection: `haptic('win')` when human wins
  - Deal animation start: `haptic('deal')`
  - Showdown moment: `haptic('cardReveal')` for opponent card reveals

#### 1.2 -- Spectator Count Badge

Show how many non-seated users are watching the table.

**File: `src/hooks/useOnlinePokerTable.ts`**
- Add `spectatorCount` state (number, default 0)
- In the Realtime channel subscription, add a `presence` track:
  - On subscribe, call `channel.track({ user_id: userId, role: isSeated ? 'player' : 'spectator' })`
  - Listen to `presence` sync events, count users where `role === 'spectator'`
  - Update `spectatorCount` on each sync
- Return `spectatorCount` from the hook

**File: `src/components/poker/OnlinePokerTable.tsx`**
- Destructure `spectatorCount` from the hook
- In the header bar, next to the `<Users>` player count, add a conditional eye badge:
  ```
  {spectatorCount > 0 && (
    <span className="flex items-center gap-0.5 text-[9px] ...">
      <Eye className="h-2.5 w-2.5" /> {spectatorCount}
    </span>
  )}
  ```

#### 1.3 -- Quick Bet Presets with 3/4 Pot

The existing `BettingControls.tsx` already has quick bets but is missing 3/4 pot.

**File: `src/components/poker/BettingControls.tsx`**
- Replace the current `quickBets` array with:
  ```
  { label: '2xBB', amount: ... },
  { label: '1/2 Pot', amount: ... },
  { label: '3/4 Pot', amount: Math.max(minRaiseTotal, Math.round(pot * 0.75) + maxBet) },
  { label: 'Pot', amount: ... },
  { label: 'All-in', amount: maxRaiseTotal },
  ```
- Remove the `3xBB` preset (less useful than 3/4 pot for pot-relative play)

---

### Stage 2: Interactive UI Features (client-side logic, moderate complexity)

#### 2.1 -- Pre-Action Buttons (Queue Actions Before Your Turn)

Allow players to pre-select an action while waiting for their turn.

**File: `src/components/poker/PreActionButtons.tsx`** (NEW)
- Three toggle buttons: "Check/Fold", "Call Any", "Check"
- Props: `{ canPreCheck: boolean; amountToCall: number; onQueue: (action: string | null) => void; queued: string | null }`
- Visual: small translucent pill buttons below the table when it's NOT the player's turn
- When a button is tapped, it highlights (gold border). Tap again to dequeue.
- "Check/Fold" = if can check, auto-check; otherwise auto-fold
- "Call Any" = auto-call any amount (or check if 0)
- "Check" = only auto-check (clears if a bet comes in)

**File: `src/components/poker/OnlinePokerTable.tsx`**
- Add state: `const [preAction, setPreAction] = useState<string | null>(null)`
- Render `<PreActionButtons>` when `!isMyTurn && isSeated && hand && mySeat?.status !== 'folded'`
- When `isMyTurn` becomes true (in the existing useEffect):
  - If `preAction === 'check_fold'`: auto-fire check or fold based on `canCheck`
  - If `preAction === 'call_any'`: auto-fire call (or check if canCheck)
  - If `preAction === 'check'`: auto-fire check if canCheck, otherwise clear
  - Clear preAction after executing
  - Add haptic feedback for auto-executed actions
- Clear preAction when hand_id changes (new hand)
- Clear preAction when pot/bet changes significantly (invalidation safety)

#### 2.2 -- Pot Odds / Equity Display

Show pot odds near the pot when it's the player's turn.

**File: `src/components/poker/PotOddsDisplay.tsx`** (NEW)
- Props: `{ pot: number; amountToCall: number; visible: boolean }`
- Calculate pot odds: `amountToCall / (pot + amountToCall) * 100` = percentage needed to break even
- Display format: "{amountToCall} to win {pot + amountToCall}" and "Need {X}% equity"
- Style: small translucent pill positioned below the pot display
- Animate in/out with `animate-fade-in`
- Only visible when `amountToCall > 0` and it's the player's turn

**File: `src/components/poker/OnlinePokerTable.tsx`**
- Import and render `<PotOddsDisplay>` below the `<PotDisplay>` component (around line 562)
- Pass `pot={totalPot}`, `amountToCall={amountToCall}`, `visible={isMyTurn && amountToCall > 0}`

#### 2.3 -- Animated Emote Reactions

Upgrade the existing QuickChat with animated floating reactions.

**File: `src/components/poker/QuickChat.tsx`**
- Replace text emojis with animated reaction buttons that have labels:
  - Thumbs Up, Clap, Laugh, Cry, Fire, Mind Blown, GG, Nice Hand
- Each reaction is a larger tappable circle (36x36) with the emoji centered
- Add a "recently used" row at the top (last 3 used, stored in localStorage)
- Increase the popover width to accommodate the grid

**File: `src/components/poker/OnlinePokerTable.tsx`**
- In the chat bubble rendering section (line 754-784):
  - Detect if the bubble text is a single emoji vs text message
  - For single emojis: render as a large (text-2xl) floating bubble with a bounce-in animation
  - For text messages: keep existing style
  - Add a subtle scale-up animation (keyframe `emote-pop`) for emoji bubbles

**File: `tailwind.config.ts`**
- Add `emote-pop` keyframe: scale 0 -> 1.3 -> 1.0 with bounce easing, duration 0.5s

---

### Stage 3: Card Peek / Squeeze Animation

This is a standalone complex feature deserving its own stage.

#### 3.1 -- Card Peek / Squeeze

Let players drag up on their hole cards to "peek" at them, mimicking real-life card squeeze.

**File: `src/components/poker/PeekableCard.tsx`** (NEW)
- Wraps `CardDisplay` with touch gesture handling
- State: `peekProgress` (0 to 1) controlled by vertical drag
- On touch start on the card area, begin tracking vertical drag distance
- As the user drags upward:
  - Card tilts with CSS `perspective` + `rotateX` (0 to -15deg based on progress)
  - A "reveal mask" clips the card face from bottom to top using `clip-path: inset(${100 - progress * 100}% 0 0 0)`
  - The card back remains visible above the clip line
  - Subtle shadow increases with tilt depth
- On touch end: if progress > 0.7, snap to fully revealed (set card as "peeked" permanently for this hand)
- If progress < 0.7, spring back to face-down
- Add a faint "drag to peek" hint text on first appearance (show once, then localStorage flag)

**File: `src/components/poker/PlayerSeat.tsx`**
- For the human player's cards section (line 87-105):
  - Replace `CardDisplay` with `PeekableCard` for the hero's hole cards
  - Pass `onPeek` callback and `isPeeked` state
  - Once peeked, cards stay face-up (current behavior) but the initial reveal uses the peek animation instead of auto-reveal

**File: `src/components/poker/OnlinePokerTable.tsx`**
- Add `cardsPeeked` state (boolean, resets on new hand_id)
- Pass `cardsPeeked` and `onCardsPeeked` to the hero's PlayerSeat
- When not yet peeked, hero cards render face-down with the peek gesture
- When peeked (or after auto-reveal timer as fallback), show normally

---

### Stage 4: Achievement System & Hand History

#### 4.1 -- Achievement / Milestone Toasts

Create a gamification layer with achievement notifications.

**File: `src/lib/poker/achievements.ts`** (NEW)
- Define achievement types:
  ```typescript
  interface Achievement {
    id: string;
    title: string;
    description: string;
    icon: string; // lucide icon name
    rarity: 'common' | 'rare' | 'epic' | 'legendary';
  }
  ```
- Achievement definitions (20+ achievements):
  - `first_win`: "First Blood" -- Win your first hand
  - `three_streak`: "Hot Streak" -- Win 3 hands in a row
  - `five_streak`: "On Fire" -- Win 5 hands in a row
  - `ten_streak`: "Unstoppable" -- Win 10 hands in a row
  - `bluff_master`: "Bluff Master" -- Win a hand without showing cards 10 times
  - `all_in_win`: "All-In Hero" -- Win an all-in showdown
  - `double_up`: "Double Up" -- Double your starting stack
  - `comeback_king`: "Comeback King" -- Win after being below 10% of average stack
  - `royal_flush`: "Royal Flush!" -- Hit a Royal Flush (legendary)
  - `straight_flush`: "Straight Flush" -- Hit a Straight Flush (epic)
  - `four_of_a_kind`: "Quads!" -- Hit Four of a Kind (rare)
  - `full_house`: "Full House" -- Hit a Full House (common)
  - `pot_monster`: "Pot Monster" -- Win a pot over 50x the big blind
  - `iron_man`: "Iron Man" -- Play 100 hands in a single session
  - `social_butterfly`: "Social Butterfly" -- Send 10 chat messages in a game
  - `early_bird`: "Early Bird" -- Join a table within 10 seconds of creation
  - `survivor`: "Survivor" -- Be the last player standing
  - `big_blind_defender`: "Blind Defense" -- Win from the big blind 5 times
  - `heads_up_hero`: "Heads Up Hero" -- Win a heads-up (2 player) game
  - `chip_leader`: "Chip Leader" -- Have the highest stack at a table with 4+ players
- Export `checkAchievements(context)` function that takes game state and returns newly unlocked achievements

**File: `src/hooks/useAchievements.ts`** (NEW)
- Manages achievement state using localStorage for tracking progress
- `unlocked: string[]` -- list of achievement IDs already earned
- `checkAndAward(context: AchievementContext)` -- checks all rules, returns newly unlocked ones
- `AchievementContext` includes: hands won, current streak, hand name, pot size, stack, bigBlind, etc.
- Stores progress counters (e.g., consecutive wins, all-in wins count) in localStorage
- Returns `{ unlocked, newAchievement, clearNew }`

**File: `src/components/poker/AchievementToast.tsx`** (NEW)
- A floating toast component that appears at the top of the poker table
- Shows achievement icon, title, description with rarity-based styling:
  - Common: silver border
  - Rare: blue glow
  - Epic: purple glow
  - Legendary: gold glow with particle shimmer
- Auto-dismisses after 4 seconds with slide-up animation
- Sound effect: a special achievement chime (new sound in usePokerSounds)

**File: `src/components/poker/OnlinePokerTable.tsx`**
- Import and use `useAchievements`
- After each hand result (in `handWinners` effect), call `checkAndAward` with current context
- If new achievements, render `<AchievementToast>`
- Add `achievement` sound event to `usePokerSounds`

**File: `src/hooks/usePokerSounds.ts`**
- Add `achievement` sound: ascending major chord (C-E-G-C) with a sparkle shimmer, ~1s duration

#### 4.2 -- Hand Replay / Last Hand Review

Step-by-step replay of the previous hand.

**File: `src/hooks/useHandHistory.ts`** (NEW)
- Maintains a circular buffer of the last 5 hands in memory
- Each hand record stores:
  ```typescript
  interface HandRecord {
    handId: string;
    handNumber: number;
    players: Array<{ name: string; seatIndex: number; startStack: number }>;
    actions: Array<{ playerName: string; action: string; amount: number; phase: string; timestamp: number }>;
    communityCards: Card[];
    winners: HandWinner[];
    pots: Array<{ amount: number }>;
    myCards: Card[] | null;
    revealedCards: RevealedCard[];
  }
  ```
- Captures data from `useOnlinePokerTable` broadcasts:
  - On new hand (preflop): snapshot players and stacks
  - On each `game_state` broadcast: record action from the actor
  - On `hand_result`: record winners and revealed cards
- Returns `{ lastHand: HandRecord | null, handHistory: HandRecord[] }`

**File: `src/components/poker/HandReplay.tsx`** (NEW)
- A drawer/sheet component showing the last hand step-by-step
- UI: timeline view with each action as a row:
  - Player name | Action (Fold/Call/Raise 500) | Phase chip
  - Community cards appear inline at phase transitions
  - Final section shows winners and pots
- Navigation: "Previous Action" / "Next Action" buttons for step-through, or "Show All" to see the full timeline
- Accessible via a small "Last Hand" button in the header bar

**File: `src/components/poker/OnlinePokerTable.tsx`**
- Import `useHandHistory` and `HandReplay`
- Feed hand data into `useHandHistory` via effects
- Add a "replay" button (History icon) in the header bar, opens `<HandReplay>` as a Sheet
- Only show when `lastHand` is available (i.e., at least one hand has completed)

---

### Stage 5: Backend-Dependent Features (database + reconnection)

#### 5.1 -- Offline Hand History (Local Cache)

Cache hand records locally so they persist across sessions.

**File: `src/hooks/useHandHistory.ts`** (extend from 4.2)
- On each hand completion, persist the `HandRecord` to localStorage under key `poker-hand-history-{tableId}`
- Store up to 20 hands per table, up to 5 tables (prune oldest)
- On hook initialization, load from localStorage
- Add `exportHistory()` function that generates a CSV from cached hands
- CSV columns: Hand#, Date, Players, My Cards, Community Cards, Winner, Pot, My P&L

#### 5.2 -- Smart Reconnection with State Recovery

Enhance the existing `ConnectionOverlay` to show exactly where the player left off.

**File: `src/components/poker/ConnectionOverlay.tsx`**
- Add props: `handInProgress: boolean`, `lastPhase: string | null`, `myStack: number | null`
- When `handInProgress` is true, show additional context:
  - "Hand in progress -- {phase}" with phase indicator
  - "Your stack: {myStack}" if known
  - "Reconnecting will restore your position"
- Add a progress bar showing reconnection attempt progress (attempt X of 6)
- Add exponential backoff: attempts at 2s, 4s, 8s, 16s, 30s, 30s instead of fixed 5s
- On successful reconnect, show a brief "Reconnected!" green flash for 1.5s before hiding

**File: `src/hooks/useOnlinePokerTable.ts`**
- Add `connectionStatus` state: `'connected' | 'reconnecting' | 'disconnected'`
- Track the last known hand phase and player stack for the overlay context
- On Realtime channel error/close, set status to 'reconnecting' and attempt to resubscribe
- On successful resubscribe, call `refreshState()` to recover full hand state
- If the channel reconnects but the hand has advanced, the `game_state` broadcast will sync automatically
- Return `connectionStatus`, `lastKnownPhase`, `lastKnownStack` from the hook

**File: `src/components/poker/OnlinePokerTable.tsx`**
- Pass the new props to `<ConnectionOverlay>`
- Use `connectionStatus` instead of the manual `isDisconnected` state

---

### Summary Table

| Stage | Feature | New Files | Modified Files | DB Changes |
|-------|---------|-----------|----------------|------------|
| 1.1 | Haptic Feedback | -- | usePokerSounds.ts, OnlinePokerTable.tsx | None |
| 1.2 | Spectator Count | -- | useOnlinePokerTable.ts, OnlinePokerTable.tsx | None |
| 1.3 | 3/4 Pot Quick Bet | -- | BettingControls.tsx | None |
| 2.1 | Pre-Action Buttons | PreActionButtons.tsx | OnlinePokerTable.tsx | None |
| 2.2 | Pot Odds Display | PotOddsDisplay.tsx | OnlinePokerTable.tsx | None |
| 2.3 | Animated Emotes | -- | QuickChat.tsx, OnlinePokerTable.tsx, tailwind.config.ts | None |
| 3.1 | Card Peek/Squeeze | PeekableCard.tsx | PlayerSeat.tsx, OnlinePokerTable.tsx | None |
| 4.1 | Achievements | achievements.ts, useAchievements.ts, AchievementToast.tsx | OnlinePokerTable.tsx, usePokerSounds.ts | None |
| 4.2 | Hand Replay | useHandHistory.ts, HandReplay.tsx | OnlinePokerTable.tsx | None |
| 5.1 | Offline History | -- | useHandHistory.ts (extend) | None |
| 5.2 | Smart Reconnection | -- | ConnectionOverlay.tsx, useOnlinePokerTable.ts, OnlinePokerTable.tsx | None |

All 12 features are client-side only -- zero database migrations required. Data is persisted via localStorage for achievements and hand history.

