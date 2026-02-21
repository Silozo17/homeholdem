

# Fix 6 Multiplayer Poker Issues

## Issue 1: "Tap a glowing seat to join" appears ON TOP of XP overlay

**Problem**: The spectator hint ("Tap a glowing seat to join") at z-index `Z.ACTIONS` (50) renders on top of the XP overlay at z-index `z-[100]`. After game over, the player leaves their seat (becomes a spectator), so the spectator overlay text appears through the XP screen.

**Fix**: In `OnlinePokerTable.tsx`, hide the spectator overlay text when the XP overlay is showing. Add a condition `!xpOverlay` to the spectator hint section (around line 1509-1522).

**File**: `src/components/poker/OnlinePokerTable.tsx`

---

## Issue 2: Mute Party (headphone/deafen) not working

**Problem**: In `useVoiceChat.ts`, `toggleDeafen` sets volume to 0 on all currently attached audio elements. However, new tracks that get subscribed AFTER deafening are not checked against `deafenedRef`. Looking at the `TrackSubscribed` handler (line 94-100), it only checks `deafenedRef.current` at subscription time, which is correct. But the issue may be that `deafenedRef` is correctly updated but `track.attachedElements` iteration in `toggleDeafen` may miss elements. The real bug is that the deafen toggle iterates `audioTrackPublications` and checks `pub.track`, but the track's `attachedElements` may not include the audio element we appended to `document.body` because LiveKit may return a new element from `track.attach()`. The fix is to also set the volume on the element we appended in `TrackSubscribed`.

**Fix**: Store all appended audio elements in a ref. In `toggleDeafen`, iterate this list to set volume. In `TrackSubscribed`, add each new element to this list and respect current deafen state.

**File**: `src/hooks/useVoiceChat.ts`

---

## Issue 3: Tapping players at the table does not open profile drawer

**Problem**: The `PlayerSeat` component has an `onClick` prop, and `OnlinePokerTable.tsx` line 1448 passes `onClick` for non-hero seats: `onClick={!isMe && seatData!.player_id ? () => setSelectedPlayer(seatData!.player_id!) : undefined}`. The `PlayerSeat` component does have `onClick` handling on line 161. However, the issue is likely that the click area is too small or that the avatar/nameplate sub-elements are blocking the click propagation. Looking at the outer div (line 154-162), it has `onClick={onClick}` but children don't prevent propagation, so it should work. Let me check if the `PlayerProfileDrawer` is correctly rendering -- it's at line 1619. The drawer uses `playerId={selectedPlayer}` which only opens when non-null. This should work. The most likely issue is that the click target is on the wrapper `div` but the avatar, nameplate, and card elements inside have `pointer-events-none` on some but not all. The card fan at line 121 has `pointer-events-none`, good. But the nameplate at line 214 does NOT have `pointer-events-none`, so it intercepts clicks without calling `onClick`. The fix is to ensure the nameplate and other clickable-looking children don't block the parent's onClick.

**Fix**: Add `pointer-events-none` to the nameplate bar and other internal elements that shouldn't intercept clicks, and ensure the outer wrapper's onClick propagates correctly. Alternatively, attach `onClick` to both the avatar and nameplate individually.

**File**: `src/components/poker/PlayerSeat.tsx`

---

## Issue 4: Players kicked out after all-in despite 2 players having chips

**Problem**: The game-over detection logic (lines 588-647) triggers when a player's stack is 0 after `handWinners` arrive, OR when only 1 player has chips. In an all-in scenario where 2+ players survive (side pots, partial all-in), the detection might incorrectly fire if there's a timing issue where `tableState.seats` hasn't fully updated with the new stacks from the hand result. This is a race condition between `handWinners` arriving and the seat stacks being updated.

**Fix**: Add a guard to the game-over detection: only trigger "LOSER" if the hero's stack is truly 0 AND handWinners don't include the hero (meaning the hero lost). Also add a brief delay or check that the seat data is post-result. Additionally, for the "WINNER" path, verify that other players with chips are truly gone (not just temporarily showing 0 during state sync).

**File**: `src/components/poker/OnlinePokerTable.tsx`

---

## Issue 5: Bonus XP for achievements

**Problem**: Currently achievements are tracked in localStorage only (via `useAchievements` hook) and award no XP. Need to add XP bonuses for hand-based achievements, with Royal Flush giving 100,000 XP.

**Implementation**:
- Define an XP bonus map per achievement ID
- When achievements are earned in multiplayer, insert XP events into `xp_events` table
- Backfill: create a one-time migration or script that checks existing `poker_play_results` for best hands and awards retroactive XP

**XP Bonus Scale**:
- `royal_flush`: 100,000 XP
- `straight_flush`: 25,000 XP
- `four_of_a_kind`: 10,000 XP
- `full_house`: 2,000 XP
- `flush_hit`: 1,000 XP
- `straight_hit`: 500 XP
- `all_in_win`: 1,500 XP
- `comeback_king`: 5,000 XP
- `survivor`: 10,000 XP
- `heads_up_hero`: 3,000 XP
- `ten_streak`: 5,000 XP
- `five_streak`: 2,000 XP
- `three_streak`: 500 XP
- `first_win`: 100 XP
- `double_up`: 500 XP
- `pot_monster`: 2,000 XP
- `iron_man`: 3,000 XP
- `chip_leader`: 500 XP
- `big_blind_defender`: 1,500 XP
- `social_butterfly`: 200 XP

**Files**: `src/lib/poker/achievements.ts`, `src/components/poker/OnlinePokerTable.tsx`

---

## Issue 6: MP achievements viewable in Profile

**Problem**: The Profile page currently shows a hardcoded set of 4 achievements based on club game stats. It does not show the poker achievements from `useAchievements` (which are stored in localStorage). Need to merge the multiplayer poker achievements into the Profile page.

**Implementation**:
- Import `ACHIEVEMENTS` from `src/lib/poker/achievements.ts` and read unlocked IDs from localStorage
- Display the poker achievements in the Profile page's Achievements section, grouped or merged with existing ones
- Show unlocked achievements with their rarity styling and locked ones as greyed out
- Map achievement icons from string names to Lucide components

**Files**: `src/pages/Profile.tsx`

---

## Summary of Files Changed

| File | Changes |
|------|---------|
| `src/components/poker/OnlinePokerTable.tsx` | Issues 1, 4, 5 -- hide spectator text during XP overlay, fix all-in game-over detection, award XP for achievements |
| `src/hooks/useVoiceChat.ts` | Issue 2 -- fix deafen not muting all audio elements |
| `src/components/poker/PlayerSeat.tsx` | Issue 3 -- fix click propagation for player profile drawer |
| `src/lib/poker/achievements.ts` | Issue 5 -- add XP bonus map per achievement |
| `src/pages/Profile.tsx` | Issue 6 -- show MP poker achievements |

## What Does NOT Change

- No navigation, bottom nav, or layout changes
- No game engine or hand evaluation logic changes
- No database schema changes (uses existing `xp_events` table)
- No edge function changes
