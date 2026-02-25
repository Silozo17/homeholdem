# Plan: Extract Four Hooks from OnlinePokerTable.tsx (1845 lines)

---

## Hook 1: usePokerAnimations

Owns visual animations: deal, community card staging, chip fly, stack freeze, phase key tracking.

### State owned (6)

1. `dealAnimDone` (init: `true`)
2. `dealing` (init: `false`)
3. `visibleCommunityCards` (init: `[]`)
4. `chipAnimations` (init: `[]`)
5. `communityCardPhaseKey` (init: `null`)
6. `displayStacks` (init: `{}`)

### Refs owned (5)

1. `stagedRunoutRef` (init: `[]`) -- runout timers
2. `prevCommunityCountRef` (init: `0`)
3. `prevAnimHandIdRef` (init: `null`) -- dedup deal anim per hand
4. `chipAnimIdRef` (init: `0`)
5. `prevPhaseRef` (init: `null`) -- phase transition tracking for communityCardPhaseKey

### Parameters from parent

1. `tableState` -- read seats, current_hand, community_cards
2. `handWinners` -- chip anim target, guard community card clear
3. `mySeatNumber` -- chip anim screen position calc
4. `preResultStacksRef` -- from useOnlinePokerTable, read for stack freeze
5. `processedActionsRef` -- cleared in deal anim effect (line 849); this ref is shared with hand history effects

### Returns

1. `dealAnimDone` -- gates action button rendering
2. `dealing` -- gates deal card sprites
3. `visibleCommunityCards` -- rendered instead of raw community_cards
4. `chipAnimations` -- rendered ChipAnimation components
5. `communityCardPhaseKey` -- key prop for CardDisplay animation
6. `displayStacks` -- passed to toPokerPlayer as display override

### Effects moved (6)

- **Line 807-836**: Staged community card reveal (runout timers)
- **Line 838-840**: Cleanup runout timers on unmount
- **Line 844-863**: Deal animation on new hand
- **Line 866-886**: Chip animation pot-to-winner
- **Line 494-507**: Stack freeze (displayStacks from preResultStacksRef)
- **Line 356-365**: Phase key tracking (communityCardPhaseKey)

### Risks

- **processedActionsRef** (line 849): The deal anim effect calls `processedActionsRef.current.clear()`. This same ref is read/written by hand history effects (lines 386-405) and voice all-in detection (lines 535-555). Sharing a ref across two hooks is fragile. **Mitigation**: Keep `processedActionsRef` in the parent. Pass it as a parameter. The animation hook calls `.clear()` on it; the parent's other effects read/write it.

---

## Hook 2: usePokerAudio

Owns sound effects, voice announcements, and haptic feedback triggers.

### State owned (0)

None. All sound/voice hooks manage their own internal state.

### Refs owned (3)

1. `firstHandRef` (init: `true`) -- "shuffling up and dealing" on first hand only
2. `bigPotAnnouncedRef` (init: `false`) -- one-shot big pot voice
3. `prevActiveCountRef` (init: `0`) -- heads-up detection

### Parameters from parent

1. `tableState` -- read current_hand, seats, pots
2. `handWinners` -- trigger win sound + voice
3. `user` -- hero id for winner voice
4. `prevPhase` / `setPrevPhase` -- phase change detection for sound triggers
5. `handStartMaxStackRef` -- read for big pot threshold (this ref is written by hand history effect and read here)
6. `processedActionsRef` -- all-in voice dedup keys

### Returns

1. `play` -- exposed for use in handleAction, handleThirtySeconds
2. `haptic` -- exposed for use in handleAction, pre-action execution
3. `soundEnabled`, `toggleSound` -- header audio menu
4. `voiceEnabled`, `toggleVoice` -- header audio menu
5. `announceCountdown` -- for handleCriticalTime
6. `announceCustom` -- for blinds_up toast effect
7. `announceGameOver` -- for game-over detection
8. `clearQueue` -- exposed (currently unused but part of voice API)
9. `precache` -- called internally, no need to expose
10. `resetHandDedup` -- called internally on hand_id change
11. `handleThirtySeconds` -- callback for PlayerSeat
12. `handleCriticalTime` -- callback for PlayerSeat (also sets criticalTimeActive)
13. `showConfetti` -- set on hero win
14. `dealerExpression` -- set on showdown

### Effects moved (8)

- **Line 337-353**: Phase sound/haptic triggers (play, haptic on phase change)
- **Line 511-532**: Voice announce winners
- **Line 535-555**: Voice detect all-in from lastActions
- **Line 558-565**: Voice detect heads-up
- **Line 568-577**: Voice big pot detection
- **Line 579-580**: Precache voice on mount
- **Line 583-586**: Reset per-hand voice dedup
- **Line 589-597**: Confetti on hero win

### Risks

- **prevPhase / setPrevPhase**: This state (line 139) is used only by the sound trigger effect (line 337-353). It can move entirely into usePokerAudio. BUT `dealerExpression` (line 138) is set inside this same effect (lines 347-348) and is used in JSX rendering (DealerCharacter). **Mitigation**: The hook returns `dealerExpression` state. Parent reads it for rendering.
- **criticalTimeActive / setCriticalTimeActive**: Set inside `handleCriticalTime` (line 896) and read by the critical countdown timer effect (line 903-919) and JSX. The countdown effect + state (`criticalCountdown`) are tightly coupled to `isMyTurn` effect (line 630 clears it). **Mitigation**: `handleCriticalTime` returned from usePokerAudio sets `criticalTimeActive` via a callback parameter `setCriticalTimeActive` passed from parent. Parent keeps `criticalTimeActive` and `criticalCountdown` state.
- **handStartMaxStackRef**: Written in hand history effect (line 380-381), read in big pot voice effect (line 571). Cross-hook ref sharing. **Mitigation**: Pass as parameter. The ref lives in parent or in usePokerGameOver (which also tracks hand stats).
- **processedActionsRef**: Shared with animation hook and hand history. Same mitigation — lives in parent, passed as parameter.

---

## Hook 3: usePokerGameOver

Owns game-over detection, XP save, and session stats tracking.

### State owned (2)

1. `gameOver` (init: `false`)
2. `xpOverlay` (init: `null`)

### Refs owned (10)

1. `xpSavedRef` (init: `false`)
2. `handsPlayedRef` (init: `0`)
3. `handsWonRef` (init: `0`)
4. `bestHandNameRef` (init: `''`)
5. `bestHandRankRef` (init: `-1`)
6. `biggestPotRef` (init: `0`)
7. `gameStartTimeRef` (init: `Date.now()`)
8. `winStreakRef` (init: `0`)
9. `startXpRef` (init: `null`)
10. `startingStackRef` (init: `0`)

### Parameters from parent

1. `user` -- auth user
2. `tableState` -- seats, current_hand for game-over detection
3. `handWinners` -- trigger game-over checks, track wins
4. `lastKnownStack` -- CASE 3 fallback
5. `gameOverPendingRef` -- set by this hook, read by broadcast hook
6. `leaveSeat` -- called on game over (delayed)
7. `leaveTable` -- called on XP overlay close
8. `onLeave` -- navigate away
9. `resetForNewGame` -- called on Play Again
10. `refreshState` -- called on Play Again
11. `announceGameOver` -- voice announcement on game end
12. `myCards` -- passed to finalizeHand
13. `revealedCards` -- passed to finalizeHand
14. `mySeatNumber` -- starting stack tracking
15. `chatCountRef` -- reset on Play Again (but this ref is also used by trackedSendChat)

### Returns

1. `gameOver` -- gates UI (Deal Hand button visibility, XP overlay)
2. `xpOverlay` -- renders XPLevelUpOverlay
3. `saveXpAndStats` -- called by handleLeave
4. `handsPlayedRef` -- read by XP overlay stats display and auto-deal CASE 4
5. `handsWonRef` -- read by XP overlay stats display
6. `bestHandNameRef` -- read by XP overlay stats display
7. `biggestPotRef` -- read by XP overlay stats display
8. `gameStartTimeRef` -- read by XP overlay stats display
9. `winStreakRef` -- read by achievement context
10. `startingStackRef` -- read by achievement context
11. `handStartMaxStackRef` -- **moved here** since it tracks per-hand stats (written by hand history effect, read by audio big pot)
12. `handlePlayAgain` -- the onPlayAgain callback for XPLevelUpOverlay
13. `handleCloseOverlay` -- the onClose callback for XPLevelUpOverlay

### Effects moved (5)

- **Line 202-206**: Capture starting XP on mount
- **Line 309-314**: Track starting stack when seated
- **Line 660-721**: Game over detection (CASE 1-4)
- **Line 782-783**: saveXpAndStatsRef sync
- **Line 786-804**: Save XP on game over + leave seat

### Risks

- **chatCountRef**: Reset inside `handlePlayAgain` (line 1653). But also incremented by `trackedSendChat` (line 319). **Mitigation**: Keep `chatCountRef` in parent. Pass to hook. Hook resets it in handlePlayAgain.
- **Achievement stats** (lines 409-492): The hand result effect at lines 407-492 writes `winStreakRef`, `handsWonRef`, `bestHandRankRef`, `bestHandNameRef`, `biggestPotRef` AND calls `checkAndAward` AND calls `finalizeHand`. These refs would now live in usePokerGameOver. **Decision**: Move the stats-tracking portion of this effect into usePokerGameOver. The hand history finalization (`finalizeHand`) and achievement checks (`checkAndAward`) stay in parent since they depend on `useHandHistory` and `useAchievements` which are composed in the parent. The hook exposes refs, parent writes them. OR the hook owns a `recordHandResult(handWinners, userId, tableState)` function that updates all its refs internally. **Recommended**: Hook exposes `recordHandResult()`. Parent calls it inside the handWinners effect.
- **handlePlayAgain** (lines 1641-1665): Resets refs from this hook AND calls `resetForNewGame()`, `setVisibleCommunityCards([])`, `prevCommunityCountRef.current = 0`, `refreshState()`. The community card resets belong to usePokerAnimations. **Mitigation**: handlePlayAgain calls a `resetAnimations()` function from usePokerAnimations, plus `resetForNewGame()` from parent.

---

## Hook 4: usePokerPreActions

Owns pre-action (auto-action) queueing and execution.

### State owned (1)

1. `preAction` (init: `null`)

### Refs owned (1)

1. `prevBetRef` (init: `0`) -- invalidate check pre-action on bet change

### Parameters from parent

1. `isMyTurn` -- trigger execution
2. `amountToCall` -- determine check vs fold vs call
3. `canCheck` -- guard check pre-action
4. `tableState` -- read current_hand.hand_id for clear, current_bet for invalidate
5. `handleAction` -- fire the action
6. `haptic` -- haptic on pre-action execution
7. `play` -- "yourTurn" sound when no pre-action queued
8. `setCriticalTimeActive` -- cleared when turn ends

### Returns

1. `preAction` -- rendered in PreActionButtons
2. `setPreAction` -- passed to PreActionButtons onQueue prop
3. `prevIsMyTurnRef` -- **no**, this stays internal

### Effects moved (3)

- **Line 600-633**: Your turn: pre-action execution + sound/haptic
- **Line 636-641**: Clear pre-action on new hand
- **Line 644-650**: Invalidate check pre-action on bet change

### Risks

- **prevIsMyTurnRef** (line 162): Used only in the your-turn effect. Moves entirely into this hook. No risk.
- **handleAction dependency**: The your-turn effect calls `handleAction` (line 618). `handleAction` is defined in the component body (not a hook), so it must be passed as a parameter. Since `handleAction` is not wrapped in `useCallback` (it's defined inline at line 1081), this could cause unnecessary re-fires. **Mitigation**: Wrap `handleAction` in `useCallback` in the parent, or pass it via a ref.
- **setCriticalTimeActive** is cleared at line 631 (`if (!isMyTurn) setCriticalTimeActive(false)`). This setter comes from the parent. Pass as parameter.

---

## Effects that CANNOT be extracted (must stay in component)

1. **Line 184-187**: Wake lock -- trivial, 4 lines, no shared state
2. **Line 191-199**: Voice chat auto-connect -- depends on `voiceChat.connect()` composed in component
3. **Line 210-243**: Achievement XP backfill -- one-shot, uses `supabase` directly, no shared state
4. **Line 251-276**: "Still playing?" countdown -- depends on `leaveSeat`, `toast`, and popup state all local to component
5. **Line 286-294**: blinds_up toast -- depends on `onBlindsUp` from hook + `toast` + `announceBlindUp`
6. **Line 297-306**: Kick for inactivity -- depends on `kickedForInactivity` from hook + `leaveSeat`
7. **Line 324-333**: Browser back button intercept -- purely UI, depends on `setShowQuitConfirm`
8. **Line 368-383**: Hand history snapshot on new hand -- depends on `startNewHand` from `useHandHistory`; also writes `handsPlayedRef` and `handStartMaxStackRef` which would live in usePokerGameOver. **Keep in parent**, call `gameOver.incrementHandsPlayed()` or write refs directly.
9. **Line 386-405**: Hand history record actions -- depends on `recordAction` from `useHandHistory`
10. **Line 407-492**: Hand history + achievements on hand result -- depends on `finalizeHand`, `checkAndAward`, `play('achievement')`. Writes game-over refs. **Keep in parent**, call `gameOver.recordHandResult()` for the stats portion.
11. **Line 652-657**: Table closed detection -- depends on `onLeave`, `toast`
12. **Line 903-919**: Critical countdown timer -- depends on `criticalTimeActive` and `action_deadline`

## useState that stays in the component (pure UI toggles)

1. `joining` -- join seat loading
2. `codeCopied` -- copy invite code feedback
3. `showConfetti` -- **moves to usePokerAudio** (set on hero win)
4. `dealerExpression` -- **moves to usePokerAudio** (set on showdown)
5. `prevPhase` / `setPrevPhase` -- **moves to usePokerAudio**
6. `kickTarget` -- kick dialog
7. `selectedPlayer` -- profile drawer
8. `closeConfirm` -- close table dialog
9. `inviteOpen` -- invite dialog
10. `showQuitConfirm` -- quit dialog
11. `showLeaveSeatConfirm` -- leave seat dialog
12. `showStillPlayingPopup` / `stillPlayingCountdown` -- inactivity popup
13. `replayOpen` -- hand replay sheet
14. `criticalTimeActive` / `criticalCountdown` -- critical time UI

---

## Shared refs (live in parent, passed to multiple hooks)

1. `processedActionsRef` -- written by animations (clear), audio (all-in dedup), hand history (action dedup)
2. `chatCountRef` -- written by trackedSendChat, reset by gameOver.handlePlayAgain
3. `handStartMaxStackRef` -- written by hand history effect, read by audio big pot. **Better**: Move to usePokerGameOver, expose it.

---

## Implementation sequence

1. Create `usePokerPreActions.ts` (simplest, ~60 lines, fewest dependencies)
2. Create `usePokerAnimations.ts` (~120 lines)
3. Create `usePokerAudio.ts` (~150 lines)
4. Create `usePokerGameOver.ts` (~200 lines, most complex dependencies)
5. Update `OnlinePokerTable.tsx` -- compose all four, wire parameters
6. &nbsp;

Flag 1 — handleAction must be wrapped in useCallback before extraction begins. If it isn’t, usePokerPreActions will re-fire the your-turn effect on every render. This must happen as a prerequisite step, not as an afterthought.

Flag 2 — handlePlayAgain in usePokerGameOver calls resetAnimations() from usePokerAnimations. This means usePokerAnimations must expose a resetAnimations() function. Make sure this is in the implementation, not missed during wiring.

Implement the Phase 3 extraction plan exactly as described. Follow this sequence strictly — do not move to the next step until the current step compiles without errors.

PREREQUISITE before any hook creation: Wrap handleAction in useCallback in OnlinePokerTable.tsx. This must be done first before any other change.

Step 1: Create src/hooks/usePokerPreActions.ts. Pass handleAction via a ref to avoid stale closure issues.

Step 2: Create src/hooks/usePokerAnimations.ts. Must expose a resetAnimations() function that clears visibleCommunityCards, resets prevCommunityCountRef, and clears staged runout timers.

Step 3: Create src/hooks/usePokerAudio.ts. handleCriticalTime receives setCriticalTimeActive as a parameter from the parent — does not own that state.

Step 4: Create src/hooks/usePokerGameOver.ts. Must expose recordHandResult() for the parent’s handWinners effect to call. handlePlayAgain must call resetAnimations() from usePokerAnimations and resetForNewGame() from useOnlinePokerTable.

Step 5: Update OnlinePokerTable.tsx to compose all four hooks and wire all parameters.

Hard constraints:

	∙	Shared refs processedActionsRef, chatCountRef, handStartMaxStackRef live in the parent component and are passed as parameters — they do not move into any hook

	∙	criticalTimeActive and criticalCountdown stay in the parent component

	∙	All effects listed as “cannot be extracted” stay in the component unchanged

	∙	No behaviour changes — all timing and state updates must be identical

	∙	After all steps complete, show final line counts for all files modified or created​​​​​​​​​​​​​​​​

## Expected result


| File                    | Lines (approx)         |
| ----------------------- | ---------------------- |
| `usePokerPreActions.ts` | ~60                    |
| `usePokerAnimations.ts` | ~120                   |
| `usePokerAudio.ts`      | ~150                   |
| `usePokerGameOver.ts`   | ~200                   |
| `OnlinePokerTable.tsx`  | ~1250 (down from 1845) |
