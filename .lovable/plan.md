

# Fix "Wins" Stat to Show Game Wins, Not Hand Wins

## Problem

The Quick Stats strip on the Dashboard shows **59 Wins**, but this counts individual **hands won** across all practice sessions (summing `hands_won` from `poker_play_results`). The user wants "Wins" to mean **games won** -- sessions where the player finished ahead.

## Solution

Change one line in `src/pages/Dashboard.tsx` (line 123).

Currently:
```js
const wins = data.reduce((s, r) => s + (r.hands_won || 0), 0);
```

Change to count games where `final_chips > starting_chips` (i.e., the player finished the session with a profit):
```js
const wins = data.filter(r => (r.final_chips || 0) > (r.starting_chips || 0)).length;
```

## Files changed

| File | Change |
|------|--------|
| `src/pages/Dashboard.tsx` | Line 123: change `wins` calculation from sum of `hands_won` to count of games where `final_chips > starting_chips` |

## What does NOT change
- `QuickStatsStrip` component -- untouched
- `PokerCareerStats` component -- untouched (it correctly shows hand-level stats)
- Bottom navigation -- untouched
- No database changes
- No styling changes

