

# Refined Plan: Play Poker (Single-Player vs AI Bots) — Final Version

## Scope

Single-player Texas Hold'em against 1-8 AI bots. No real money. All game logic runs client-side. Database used only for persisting completed game stats.

> **Out of scope:** Human multiplayer requires server-authoritative card dealing, realtime game state synchronization, and anti-cheat measures. This is a future phase.

---

## 1. pushManager Build Fix

**Finding:** `tsconfig.app.json` already includes `"lib": ["ES2020", "DOM", "DOM.Iterable"]`. The `DOM` lib provides `PushManager` and `PushSubscription` types. The issue is that `ServiceWorkerRegistration` in the DOM lib does not declare `pushManager` as a property in all TS versions.

**Fix:** Create a dedicated type file `src/types/push.d.ts` (not in `vite-env.d.ts`) to keep it isolated:

```typescript
// Push API type augmentation
// The DOM lib provides PushManager but some TS versions
// don't declare it on ServiceWorkerRegistration
interface ServiceWorkerRegistration {
  readonly pushManager: PushManager;
}
```

This compiles because `PushManager` is already defined by the `DOM` lib. The file is auto-included via `tsconfig.app.json`'s `"include": ["src"]`.

---

## 2. All-In Simplification (Phase 1 Rule)

Phase 1 uses a **capped betting** model:

- When a player goes all-in, betting for that hand is capped at the all-in player's stack size
- Other players' excess bets above that amount are refunded
- No side pots are created
- This means the all-in player can only win up to their stack from each opponent

This is a known simplification and will be displayed to the player in the lobby as a house rule note. Phase 2 introduces proper side pot distribution.

---

## 3. Bot AI: Preflop vs Postflop Logic

The bot AI uses **two distinct evaluation paths**:

### Preflop (no community cards)
Simple starting hand scoring based on:
- **Pair bonus**: pocket pairs scored by rank (AA = top, 22 = low)
- **High card value**: sum of card ranks (A=14, K=13, etc.)
- **Suited bonus**: +2 if both cards share a suit
- **Connectedness**: +1 if cards are adjacent ranks (e.g., JT, 98)
- **Gap penalty**: -1 per rank gap beyond 1

This produces a 0-100 strength score. Thresholds:
- Score > 75: raise
- Score > 40: call
- Below 40: fold (with random bluff chance ~10%)

### Postflop (flop, turn, river)
Uses the hand evaluator on known cards (hole cards + community cards dealt so far):
- Evaluate current best hand rank
- If rank >= Two Pair: raise/bet
- If rank == One Pair (top pair or better): call
- If rank == One Pair (low pair) or High Card: check/fold based on pot size
- Random bluff chance ~8%

Phase 2 will add pot-odds calculation, draw counting, and multiple difficulty levels.

---

## 4. Game Engine: Finite State Machine

```text
IDLE --> DEALING --> PREFLOP --> FLOP --> TURN --> RIVER --> SHOWDOWN --> HAND_COMPLETE
                                                                            |
                                                                      DEALING (next hand)
                                                                         or GAME_OVER
```

Implemented as `useReducer` with typed action discriminants. State transitions are explicit -- invalid actions are logged and ignored (no silent failures).

### Timer Management
- Bot "thinking" delays use `setTimeout` stored in a `useRef`
- Deal animations use CSS transitions (no JS timers)
- All timeouts cleared on unmount via cleanup in `useEffect`
- No `setInterval` used anywhere in the game loop
- Bot timeout safety: if bot hasn't acted within 3 seconds, auto-fold

---

## 5. Testing

**Runner:** Vitest (already configured). Pattern: `src/**/*.{test,spec}.{ts,tsx}`.

**Test files:**

| File | What it tests |
|------|---------------|
| `src/lib/poker/hand-evaluator.test.ts` | 26 deterministic hand ranking cases |
| `src/lib/poker/deck.test.ts` | Deck creation (52 cards, no dupes), shuffle produces different order |

All tests are pure logic -- no DOM, no React, no mocking needed. They import functions directly and assert outputs.

### Hand Evaluator Test Cases (26)

| # | Case | Expected |
|---|------|----------|
| 1 | Royal flush (spades) | Rank 9 |
| 2 | Straight flush (5-9 hearts) | Rank 8 |
| 3 | Ace-low straight flush (A-2-3-4-5 suited) | Rank 8, lowest SF |
| 4 | Four of a kind (aces) | Rank 7 |
| 5 | Four of a kind (twos) vs four of a kind (threes) | Threes wins |
| 6 | Full house (K-K-K-3-3) | Rank 6 |
| 7 | Full house (Q-Q-Q-A-A) vs (K-K-K-2-2) | Kings win (trips rank) |
| 8 | Flush (ace high) | Rank 5 |
| 9 | Flush tie-break (same top 4, different 5th) | Higher 5th wins |
| 10 | Straight (ace high: T-J-Q-K-A) | Rank 4 |
| 11 | Straight (ace low: A-2-3-4-5) | Rank 4, value = 5-high |
| 12 | Straight (6-7-8-9-T) | Rank 4 |
| 13 | Three of a kind kicker comparison | Higher kicker wins |
| 14 | Two pair (A-A-K-K-x vs A-A-Q-Q-x) | Kings beat queens |
| 15 | Two pair same pairs, different kicker | Higher kicker wins |
| 16 | One pair (aces vs kings) | Aces win |
| 17 | One pair same rank, kicker decides | Higher kicker wins |
| 18 | High card (A-K-Q-J-9 vs A-K-Q-J-8) | 9 beats 8 |
| 19 | Best 5 from 7 cards (ignore worst 2) | Correct best hand selected |
| 20 | Split pot (identical hands) | Equal rank |
| 21 | Flush vs straight | Flush wins |
| 22 | Full house vs flush | Full house wins |
| 23 | Ace-low straight vs pair of aces | Straight wins |
| 24 | Three community pairs, best kicker | Correct two pair + kicker |
| 25 | Seven cards all same suit | Best 5-card flush |
| 26 | Wheel straight (A-2-3-4-5 unsuited) | Rank 4, value = 5-high |

---

## 6. Database Schema

```sql
CREATE TABLE public.poker_play_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL DEFAULT auth.uid(),
  club_id UUID REFERENCES public.clubs(id) ON DELETE SET NULL,
  hands_played INTEGER NOT NULL DEFAULT 0,
  hands_won INTEGER NOT NULL DEFAULT 0,
  biggest_pot INTEGER DEFAULT 0,
  best_hand_rank INTEGER DEFAULT 0,
  best_hand_name TEXT DEFAULT '',
  final_chips INTEGER NOT NULL DEFAULT 0,
  starting_chips INTEGER NOT NULL DEFAULT 0,
  bot_count INTEGER NOT NULL DEFAULT 0,
  game_mode TEXT NOT NULL DEFAULT 'bots',
  duration_seconds INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.poker_play_results ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_poker_results_user_date
  ON public.poker_play_results (user_id, created_at DESC);

CREATE POLICY "Users view own poker results"
  ON public.poker_play_results FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users insert own poker results"
  ON public.poker_play_results FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
```

- `user_id` defaults to `auth.uid()` -- cannot be spoofed from client
- No UPDATE/DELETE policies -- results are immutable
- Index on `(user_id, created_at DESC)` for stats queries

---

## 7. Files to Create

| File | Purpose |
|------|---------|
| `src/types/push.d.ts` | Isolated pushManager type augmentation (build fix) |
| `src/lib/poker/types.ts` | Card, Suit, Rank, Player, GameState, Action types |
| `src/lib/poker/deck.ts` | createDeck(), shuffle() with crypto.getRandomValues() + Fisher-Yates |
| `src/lib/poker/hand-evaluator.ts` | evaluateHand(), compareHands(), getHandName() |
| `src/lib/poker/bot-ai.ts` | decideBotAction() with preflop/postflop logic |
| `src/lib/poker/hand-evaluator.test.ts` | 26 deterministic test cases |
| `src/lib/poker/deck.test.ts` | Deck and shuffle tests |
| `src/hooks/usePokerGame.ts` | useReducer FSM game engine |
| `src/pages/PlayPoker.tsx` | Route page (lobby + game) |
| `src/components/poker/PokerTable.tsx` | Table layout with felt background |
| `src/components/poker/PlayerSeat.tsx` | Player/bot seat with cards and chips |
| `src/components/poker/BettingControls.tsx` | Action buttons + raise slider |
| `src/components/poker/CardDisplay.tsx` | Card with CSS flip animation |
| `src/components/poker/PotDisplay.tsx` | Pot amount display |
| `src/components/poker/HandResult.tsx` | Showdown winner overlay |
| `src/components/poker/PlayPokerLobby.tsx` | Game setup (bots, chips) |

## Files to Modify

| File | Change |
|------|--------|
| `src/App.tsx` | Add `/play-poker` route |
| `src/i18n/locales/en.json` | Poker play translations |
| `src/i18n/locales/pl.json` | Poker play translations |

---

## 8. Implementation Order

1. Create `src/types/push.d.ts` (build fix)
2. Create `src/lib/poker/types.ts` (all type definitions)
3. Create `src/lib/poker/deck.ts` + `deck.test.ts` (run tests)
4. Create `src/lib/poker/hand-evaluator.ts` + `hand-evaluator.test.ts` (run tests, verify all 26 pass)
5. Create `src/lib/poker/bot-ai.ts` (preflop scoring + postflop evaluation)
6. Create `src/hooks/usePokerGame.ts` (FSM with useReducer)
7. Create UI components (table, cards, seats, controls, lobby)
8. Create `src/pages/PlayPoker.tsx` + wire route in App.tsx
9. Create database table with migration tool
10. Add result persistence on game end
11. Add i18n translations

---

## 9. Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|------------|
| Hand evaluator bug | High | 26 unit tests with known outcomes, run before UI work |
| Bot stuck in loop | High | 3-second timeout auto-folds; no setInterval |
| Memory leak from timers | Medium | setTimeout in refs, cleared on unmount |
| Stats spoofing | Low | RLS + auth.uid() default, no UPDATE policy |
| All-in confusion | Low | Clear "simplified rules" notice in lobby |

