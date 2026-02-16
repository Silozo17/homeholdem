

# 7 Multiplayer Poker Improvements

## 1. Sequential Card Reveal During Deal Animation

**Problem**: Both hole cards appear instantly when the deal animation starts, rather than revealing one at a time as the animated card-back reaches the player.

**Root Cause**: In `PlayerSeat.tsx`, the human's hole cards render immediately with only a CSS `dealDelay` on the CardDisplay animation. The card content (face) is visible from the start -- the `dealDelay` only delays the entrance animation, not the rendering.

**Fix**: Add a state-based reveal in `PlayerSeat.tsx` where each card stays `faceDown` until its deal delay has elapsed. Use a `setTimeout` per card that matches the `dealDelay` timing to flip from face-down to face-up.

**Files**: `src/components/poker/PlayerSeat.tsx`

---

## 2. Turn Timer Ring Not Visible

**Problem**: The `TurnTimer` SVG ring is not showing for online multiplayer.

**Root Cause**: In `PlayerSeat.tsx` line 114-116, the `TurnTimer` is rendered with `size={80}` but positioned via `absolute inset-0` with `transform: translate(-50%, -50%)` centered on the avatar. The SVG `width/height` is 80px, but the parent `div` (the avatar wrapper) is much smaller than 80px in practice, causing the SVG to be clipped or hidden behind other elements due to z-index. The `inset-0` class sets `top/left/right/bottom: 0`, but the style override `left: 50%; top: 50%; transform: translate(-50%, -50%)` conflicts, and the SVG may render outside the visible bounds.

**Fix**: In `TurnTimer.tsx`, remove the conflicting `inset-0` class and ensure the SVG is properly centered over the avatar with correct z-index. Set `z-index: 10` on the SVG to ensure it renders above the avatar image.

**Files**: `src/components/poker/TurnTimer.tsx`

---

## 3. Move "YOUR TURN" Pill Above Cards

**Problem**: The "YOUR TURN" pill overlaps the player's profile icon at the bottom of the screen.

**Fix**: In `OnlinePokerTable.tsx`, reposition the "YOUR TURN" badge from its current bottom-positioned absolute placement to sit above the hero's hole cards. Place it above the table scene at approximately 60-65% from the top, centered horizontally, so it floats above the two cards but below the community cards area.

**Files**: `src/components/poker/OnlinePokerTable.tsx`

---

## 4. Reduce Post-Hand Pause Duration

**Problem**: The pause between hand completion and next deal is too long.

**Root Cause**: In `useOnlinePokerTable.ts` line 256, the showdown timer is set to `7000ms` (7 seconds). Combined with the auto-deal timer of `2000-3000ms`, total pause is ~9-10 seconds.

**Fix**: Reduce the showdown timer from `7000ms` to `3500ms` (half). The auto-deal timer adds another ~2s, so total gap becomes ~5.5s -- enough to see results but fast enough to keep the game moving.

**Files**: `src/hooks/useOnlinePokerTable.ts`

---

## 5. Auto-Remove Inactive/Disconnected Players

**Problem**: Players who exit the app or close their PWA remain visible at the table.

**Fix**: Track consecutive timeout folds per player. When a player's turn times out (auto-fold via `poker-check-timeouts`), increment a counter. After 2 consecutive timeout folds, auto-kick the player by calling the leave-table logic server-side. This is implemented in the `poker-action` edge function where timeout folds are processed.

Additionally, add a `last_activity_at` timestamp to `poker_seats` (via migration), updated on every action. The `poker-check-timeouts` cron job will also check for players inactive for over 2 minutes and auto-remove them.

**Files**:
- `supabase/functions/poker-action/index.ts` (track consecutive timeouts)
- `supabase/functions/poker-check-timeouts/index.ts` (check inactivity + auto-kick)
- Database migration: add `consecutive_timeouts` and `last_activity_at` columns to `poker_seats`

---

## 6. Investigate Game Freeze After Multiple Hands

**Problem**: After several hands, the dealer stops dealing and the game freezes.

**Root Cause analysis**: Most likely the `autoStartAttempted` state gets stuck at `true` and never resets. The reset happens in the `showdownTimerRef` callback (line 265: `setAutoStartAttempted(false)`), but if a hand completes without a `hand_result` broadcast (e.g., all opponents fold pre-showdown and the server sends `game_state` with phase `complete` instead of `hand_result`), the showdown timer never fires, and `autoStartAttempted` stays `true` forever.

**Fix**: Add a fallback reset: whenever `current_hand` becomes `null` (hand cleared), ensure `autoStartAttempted` is reset to `false`. Also, in the `game_state` broadcast handler, if the incoming phase is `complete`, trigger the same cleanup logic as `hand_result` with a shorter delay.

**Files**: `src/hooks/useOnlinePokerTable.ts`

---

## 7. Make Chip-to-Winner Animation Visible

**Problem**: The chip fly animation from pot to winner is not visually noticeable.

**Root Cause**: The `ChipAnimation` component uses CSS custom properties (`--chip-dx`, `--chip-dy`) with percentage values, but the keyframe `chip-fly-custom` uses `translate(var(--chip-dx), var(--chip-dy))` where the percentage is relative to the element itself (4px chip), not the container. So the chips barely move.

**Fix**: 
1. Change `ChipAnimation` positioning to use `calc()` with explicit pixel-based movement derived from container dimensions.
2. Stagger the 6 chips with slight delays (0, 50ms, 100ms...) and randomized paths for a more dramatic "pot sweep" effect.
3. Make chips larger (w-5 h-5) with a brighter gold trail/glow.

**Files**: `src/components/poker/ChipAnimation.tsx`, `src/index.css`

---

## Summary

| # | Issue | Files |
|---|-------|-------|
| 1 | Sequential card reveal | `PlayerSeat.tsx` |
| 2 | Turn timer not visible | `TurnTimer.tsx` |
| 3 | YOUR TURN pill position | `OnlinePokerTable.tsx` |
| 4 | Reduce post-hand pause | `useOnlinePokerTable.ts` |
| 5 | Auto-remove disconnected players | `poker-action`, `poker-check-timeouts`, DB migration |
| 6 | Game freeze after many hands | `useOnlinePokerTable.ts` |
| 7 | Chip animation visibility | `ChipAnimation.tsx`, `index.css` |

