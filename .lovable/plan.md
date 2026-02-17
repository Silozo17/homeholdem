
# Voice Announcements for Multiplayer Poker using ElevenLabs

## What Already Exists

- **Edge function** `tournament-announce` -- calls ElevenLabs TTS API (Brian voice, `eleven_turbo_v2_5` model), returns base64 MP3
- **Hook** `useTournamentSounds` -- already has `playAnnouncement()` that calls the edge function, but is only used in the tournament clock (home game mode), NOT in online multiplayer
- **Hook** `usePokerSounds` -- Web Audio API beeps/tones for multiplayer game actions (fold, call, raise, etc.)
- **ELEVENLABS_API_KEY** secret is already configured

## What Needs to Be Built

Create a new hook `usePokerVoiceAnnouncements` specifically for the multiplayer poker table that calls the existing `tournament-announce` edge function for these events:

### 1. Blinds Up Announcement
- **Trigger**: The `blinds_up` broadcast event already exists (line 300 of `useOnlinePokerTable.ts`)
- **Message**: "Blinds are now {small} / {big}"
- **Integration**: In `OnlinePokerTable.tsx`, the `onBlindsUp` callback (line 155) already fires a toast. Add voice announcement alongside it.

### 2. Turn Timer -- Last 5 Seconds Countdown
- **Trigger**: `TurnTimer.tsx` fires `onLowTime` when 5 seconds remain. `OnlinePokerTable.tsx` line 471 handles it via `handleLowTime`.
- **Message**: "Five... Four... Three... Two... One" (short countdown) OR a single "Time is running out" announcement
- **Note**: Since ElevenLabs TTS has ~1-2s latency, a full countdown won't be in sync. Better approach: play a single "Time's running out!" voice line when `onLowTime` fires (at 5s remaining), combined with the existing beep/vibration.

### 3. Hand Winner Announcement
- **Trigger**: `handWinners` state updates in `useOnlinePokerTable.ts` line 264. `OnlinePokerTable.tsx` already detects this at line 259.
- **Message**: "{player_name} wins {amount} chips with {hand_name}" (e.g. "Player1 wins 500 chips with a Full House")
- **For hero wins**: "You win {amount} chips with {hand_name}!"

### 4. Game Over / Final Winner Announcement
- **Trigger**: `gameOver` state becomes true (line 377-401 in `OnlinePokerTable.tsx`)
- **Message**: "Game over! {winner_name} takes it all!" or "Congratulations! You are the champion!"

### 5. Additional Immersive Voice Lines (New Ideas)

| Event | Trigger Point | Example Message |
|-------|---------------|-----------------|
| **New hand dealt** | `preflop` phase detected (line 195) | "Shuffling up and dealing" (first hand only) |
| **All-in called** | When a player goes all-in (detected from `lastActions`) | "All in! We have an all-in!" |
| **Heads-up reached** | `activePlayers.length === 2` after a bust-out | "We're heads up!" |
| **Big pot** | When `totalPot` exceeds 10x big blind | "Big pot building!" |
| **Player eliminated** | When a seat goes from active to `stack <= 0` | "{name} has been eliminated" |
| **Player joins table** | `seat_change` broadcast with join action | "Welcome to the table" |

## Technical Architecture

### New Hook: `usePokerVoiceAnnouncements`

```text
src/hooks/usePokerVoiceAnnouncements.ts

- Wraps calls to the existing `tournament-announce` edge function
- Manages a queue so announcements don't overlap (one at a time)
- Has an enable/disable toggle (respects existing sound toggle)
- Implements caching: common phrases like "Shuffling up and dealing" are
  cached in memory after first play to avoid repeat API calls
- Deduplication: prevents the same announcement within 3 seconds
- Returns: { announceBlindUp, announceWinner, announceCountdown,
             announceGameOver, announceCustom, voiceEnabled, toggleVoice }
```

### Audio Queue System

Since TTS has network latency (~1-2s), the hook will:
1. Queue announcements if one is already playing
2. Skip queued items older than 5 seconds (stale)
3. Play sound effects immediately (existing system) while voice loads async

### Caching Strategy

- Cache generated audio in a `Map<string, string>` (message -> base64 data URI)
- Common phrases reuse cached audio
- Dynamic messages (player names, chip amounts) are not cached
- Cache limited to 20 entries with LRU eviction

### Integration Points in `OnlinePokerTable.tsx`

1. Import and initialize `usePokerVoiceAnnouncements` alongside `usePokerSounds`
2. Wire the voice toggle to the existing sound button (or add a separate mic icon)
3. Add voice calls at these existing trigger points:
   - **Line 155** (`onBlindsUp` callback): call `announceBlindUp(small, big)`
   - **Line 259** (`handWinners` effect): call `announceWinner(winnerName, amount, handName)`
   - **Line 377** (game over effect): call `announceGameOver(winnerName)`
   - **Line 471** (`handleLowTime`): call `announceCountdown()`
   - **Line 195** (phase change to preflop): call `announceCustom("Shuffling up and dealing")` on first hand
   - New effect watching `lastActions` for all-in: call `announceCustom("All in!")`
   - New effect watching active player count for heads-up detection

### Sound Toggle UX

Add a dedicated voice toggle button next to the existing sound toggle in the header bar (line 704). Two separate controls:
- Speaker icon: existing SFX on/off
- Microphone/voice icon: voice announcements on/off

Both default to ON.

## File Changes Summary

| File | Change |
|------|--------|
| `src/hooks/usePokerVoiceAnnouncements.ts` | **New file** -- voice announcement hook with queue, cache, and dedup |
| `src/components/poker/OnlinePokerTable.tsx` | Import hook, wire to game events, add voice toggle button |
| `supabase/functions/tournament-announce/index.ts` | No changes needed -- already works perfectly |

## Cost and Performance Considerations

- ElevenLabs `eleven_turbo_v2_5` model is fast (~1s latency) and cost-efficient
- Caching common phrases minimizes API calls per session
- Average game might make 10-20 TTS calls (blinds up + winners + special events)
- Voice announcements are client-side only -- each player's device calls independently
- No database changes required
