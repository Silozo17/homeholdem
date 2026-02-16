
# Fix Card/Pot Positioning, Reverse Betting Direction, Add Blind Timer

## 1. Move Pot Under Dealer & Center Cards

**Current**: Pot at `top: 28%`, community cards at `top: 44%`.

**Fix in `src/components/poker/PokerTablePro.tsx`**:
- Move pot display to `top: 14%` (directly under the dealer character at `top: 2%`)
- Keep community cards at `top: 44%` with `transform: translate(-50%, -50%)` — this is the visual center of the felt. If they appear off, it may be because the table image isn't symmetric. Adjust to `top: 42%` for better visual centering.

## 2. Reverse Betting Direction (Make It Clockwise)

**Problem**: The current `SEAT_PICKS` order is `Y → E(bot-right) → F(right) → G → H → D → C → B → A(bot-left)`. Since the game engine iterates indices 0,1,2,3..., this moves RIGHT first from the hero, which is **anti-clockwise** when viewed from above.

**Real poker clockwise** (to the left of each player): `Y(bottom) → A(bot-left) → B(left) → C(upper-left) → D(top-left) → H(top-right) → G(upper-right) → F(right) → E(bot-right)`.

**Fix in `src/lib/poker/ui/seatLayout.ts`**: Reverse SEAT_PICKS to follow true clockwise order:

```
2: ['Y', 'D']
3: ['Y', 'B', 'F']
4: ['Y', 'B', 'D', 'F']
5: ['Y', 'A', 'C', 'G', 'E']
6: ['Y', 'A', 'B', 'D', 'F', 'E']
7: ['Y', 'A', 'B', 'D', 'H', 'F', 'E']
8: ['Y', 'A', 'B', 'C', 'D', 'H', 'G', 'E']
9: ['Y', 'A', 'B', 'C', 'D', 'H', 'G', 'F', 'E']
```

This ensures that index+1 in the game engine moves to the player's LEFT (clockwise on the table). Dealer button, small blind, and big blind all rotate using `dealerIndex + 1`, so they will now correctly move clockwise too.

## 3. Blind Timer (Blind Level Progression)

Add a blind level system that increases blinds at configurable intervals.

### Changes to `src/lib/poker/types.ts`:
- Add `blindTimer` to `LobbySettings`: `blindTimer: number` (minutes: 0 = no increase, 5/10/15/30)
- Add to `GameState`:
  - `blindLevel: number` (current level index)
  - `blindTimer: number` (interval in minutes, 0 = off)
  - `lastBlindIncrease: number` (timestamp of last increase)

### Blind structure (hardcoded levels):
```
Level 1: 25/50
Level 2: 50/100
Level 3: 75/150
Level 4: 100/200
Level 5: 150/300
Level 6: 200/400
Level 7: 300/600
Level 8: 500/1000
Level 9: 1000/2000
Level 10: 2000/4000
```

The starting level is determined by the initial big blind setting chosen in the lobby.

### Changes to `src/hooks/usePokerGame.ts`:
- In the `DEAL_HAND` case, check if enough time has passed since `lastBlindIncrease`. If `Date.now() - lastBlindIncrease >= blindTimer * 60000`, advance to the next blind level and update `smallBlind`, `bigBlind`, and `lastBlindIncrease`.
- Initialize `lastBlindIncrease` to `Date.now()` in `START_GAME`.

### Changes to `src/components/poker/PlayPokerLobby.tsx`:
- Add a "Blind Timer" selector with options: Off, 5 min, 10 min, 15 min, 30 min
- Pass `blindTimer` in the `LobbySettings` object

### Changes to `src/components/poker/PokerTablePro.tsx`:
- Display a small "Next blind increase" countdown in the HUD header (near the blinds display) when blind timer is active. Show time remaining until next level.

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/poker/PokerTablePro.tsx` | Move pot to under dealer (~14%), adjust card centering, add blind timer countdown display |
| `src/lib/poker/ui/seatLayout.ts` | Reverse SEAT_PICKS to true clockwise order |
| `src/lib/poker/types.ts` | Add `blindTimer` to LobbySettings, add blind tracking fields to GameState |
| `src/hooks/usePokerGame.ts` | Add blind level progression logic in DEAL_HAND, initialize in START_GAME |
| `src/components/poker/PlayPokerLobby.tsx` | Add blind timer selector (Off/5/10/15/30 min) |
