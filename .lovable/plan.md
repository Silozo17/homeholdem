

# Speed Up Card Dealing Animation

The delay has two parts: a network pre-fetch delay and a slow animation stagger. Here is what to change.

## Root Causes

1. **200ms artificial delay** before fetching hole cards from the server (line 462 of `useOnlinePokerTable.ts`). This was added so the animation has time to start before cards arrive, but it adds unnecessary latency.

2. **Slow stagger multiplier (0.30s per card)** in `PlayerSeat.tsx` line 105. With 6 players, each "round" of dealing takes 6 x 0.30 = 1.8s, meaning your 2nd card arrives 1.8s after your 1st.

3. **0.45s flip animation** added on top of the stagger (line 106).

## Changes

### 1. Reduce network pre-fetch delay
**File:** `src/hooks/useOnlinePokerTable.ts`
- Change the 200ms setTimeout to 50ms (just enough to let the hand state settle, but fetch cards much sooner).

### 2. Speed up the dealing stagger
**File:** `src/components/poker/PlayerSeat.tsx`
- Change the per-card stagger from `0.30` to `0.18` seconds (lines 105 and 122).
- This reduces the gap between 1st and 2nd card from 1.8s to ~1.1s for 6 players.

### 3. Shorten the card flip overlay
**File:** `src/components/poker/PlayerSeat.tsx`
- Change the extra flip time from `0.45` to `0.30` seconds (line 106).

### 4. Match the CSS card-reveal animation
**File:** `src/components/poker/CardDisplay.tsx`
- Change the face-down overlay animationDelay from `dealDelay + 0.45` to `dealDelay + 0.30` (line 37).

## Result

| Metric (6 players) | Before | After |
|---------------------|--------|-------|
| Network pre-delay | 200ms | 50ms |
| Per-card stagger | 300ms | 180ms |
| Flip animation add | 450ms | 300ms |
| Gap between your 2 cards | ~1.8s | ~1.1s |
| Total deal animation | ~4.1s | ~2.5s |

## Files Changed

| File | Change |
|------|--------|
| `src/hooks/useOnlinePokerTable.ts` | Reduce pre-fetch delay from 200ms to 50ms |
| `src/components/poker/PlayerSeat.tsx` | Stagger 0.30 to 0.18, flip 0.45 to 0.30 |
| `src/components/poker/CardDisplay.tsx` | Match flip overlay to 0.30 |

## NOT Changed
- Edge functions, server logic, bottom navigation, layout, styles, logo
