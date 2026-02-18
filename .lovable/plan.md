

# Bot Game Improvements: Faster Cards, No Pre-Deal Betting, No XP

## Changes

### 1. Don't start betting until cards are dealt (src/hooks/usePokerGame.ts)

Currently, the `DEAL_HAND` action is dispatched after 1800ms (line 548-556), which transitions the phase to `preflop` immediately. If the first player to act is a bot, it waits for the deal animation to finish (`dealAnimEndRef`), but the **human player** sees the betting controls appear before cards finish dealing visually.

**Fix:** Add a `waitingForDeal` flag to the state. Set it to `true` when `DEAL_HAND` runs, and clear it after the deal animation completes. The `isHumanTurn` check (line 637-641) and bot action trigger (line 589-614) will both gate on this flag being `false`.

Specifically:
- In the `DEAL_HAND` case, add `dealAnimDone: false` to the returned state
- Add a new action `DEAL_ANIM_DONE` that sets `dealAnimDone: true`
- After dispatching `DEAL_HAND`, schedule a timeout for the deal animation duration, then dispatch `DEAL_ANIM_DONE`
- Gate bot actions (line 589) and `isHumanTurn` (line 637) on `state.dealAnimDone === true`

### 2. Speed things up -- human sees cards faster (src/hooks/usePokerGame.ts)

- Reduce the dealing phase delay from **1800ms to 800ms** (line 556)
- Reduce the deal animation timing formula to be faster: change the per-card delay multiplier from **0.35 to 0.18** (line 554)
- Reduce bot "thinking" time from **1500 + random 1500ms** to **800 + random 700ms** (line 613)
- Reduce showdown dramatic pause from **2500ms to 1500ms** (line 564)
- Reduce hand_complete pause from **4500ms to 3000ms** (line 571)

### 3. Do not count XP for bot games (src/pages/PlayPoker.tsx)

Remove the XP insertion block entirely (lines 48-53). Keep the `poker_play_results` insert for history/stats tracking, but delete the `xp_events` insert so bot games award zero XP.

## Files Changed

| File | Change |
|------|--------|
| `src/hooks/usePokerGame.ts` | Add `dealAnimDone` gating, speed up timings |
| `src/pages/PlayPoker.tsx` | Remove XP award block for bot games |

