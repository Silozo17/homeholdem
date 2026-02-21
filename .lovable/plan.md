

# Fix 4 Multiplayer Poker Issues

## Issue 1: Connection Overlay Missing Translations

**Problem**: `ConnectionOverlay.tsx` has 7 hardcoded English strings that show as raw text instead of using `t()` translation keys.

**Fix**: Replace all hardcoded strings with `t()` calls and add the keys to both `en.json` and `pl.json`.

Strings to translate:
- "Reconnected!" (line 85)
- "Hand:" (line 131)
- "Pre-Flop" (line 133)
- "Your stack:" (line 138)
- "Reconnecting will restore your position" (line 143)
- "Reconnecting..." / "Auto-reconnect exhausted" / "Attempt X/Y" (lines 155-159)

**Files**: `src/components/poker/ConnectionOverlay.tsx`, `src/i18n/locales/en.json`, `src/i18n/locales/pl.json`

---

## Issue 2: Winner Announced Before Community Cards Finish Dealing

**Problem**: When players go all-in, the server sends all community cards at once. The staged runout animation (`setVisibleCommunityCards`) takes up to 3 seconds to reveal all 5 cards. However, `handWinners` arrives simultaneously, and the winner voice announcement fires immediately (line 484-499) before the cards finish animating.

**Fix**: Delay the winner voice announcement until the staged runout completes. Calculate the delay based on how many cards are being staged:
- If all 5 cards arrive at once (from 0): flop instant + turn at 1.5s + river at 3s + 1s pause = announce at 4s
- If fewer cards staged, proportionally less delay
- Store whether if a runout is in progress via a ref, and gate the winner announcement behind it

**Files**: `src/components/poker/OnlinePokerTable.tsx`

---

## Issue 3: Voice Announcements Being Skipped

Three bugs causing skipped announcements:

**Bug A**: `break` on line 514 -- only the FIRST all-in player in `lastActions` is announced. If two players go all-in in the same action batch, only one is spoken. Remove the `break`.

**Bug B**: `STALE_MS = 5000` in `usePokerVoiceAnnouncements.ts` -- items queued while another is playing get discarded if they sit in the queue for over 5 seconds. Since TTS fetch + playback can easily take 3-4 seconds per item, queued items expire before being played. Increase `STALE_MS` to 15000.

**Bug C**: `DEDUP_MS = 3000` -- prevents announcing two different winners within 3 seconds because the dedup compares only the message text. Since winner messages are unique per player name, this should not be the issue, but for all-in it could be (e.g., two "All in!" messages for different players have different text so this is fine). The real dedup issue is that the `processQueue` function doesn't re-trigger after adding new items if it's currently playing. After the `while` loop ends and `playingRef` is set to false, new items added during playback are never processed. Fix: call `processQueue()` at the end of each iteration to check for new items, or use a recursive approach.

**Files**: `src/components/poker/OnlinePokerTable.tsx` (remove `break`), `src/hooks/usePokerVoiceAnnouncements.ts` (increase `STALE_MS`, fix queue drain)

---

## Issue 4: Big Pot Threshold Too Low

**Problem**: Currently triggers when pot exceeds `big_blind * 10`. For a table with 25/50 blinds and 5000 starting chips, that's only 500 chips -- way too early.

**Fix**: Use `min_buy_in * 0.10` (10% of starting chips per player) as the threshold. The table object has `min_buy_in` which represents the starting chip amount. If `min_buy_in` is 5000, threshold = 500. If `min_buy_in` is 50000, threshold = 5000.

Wait -- looking at the numbers again: for 5k starting chips, 10% = 500 which is 10x the big blind (50). That matches the current threshold coincidentally. The user wants 1k for 5k starting = 20% of starting chips. Let me re-read: "at least 10% of the starting player chips" and "5k chips each, thats 1k chips". 10% of 5k = 500, not 1k. But user said 1k. So user means 20%. Actually re-reading: "at least 10% of the starting player chips (single player not all players accumulated). For games where the starting players amount is 5k chips each, thats 1k chips". 10% of 5k is 500, not 1k. The user may have miscalculated, but their intent is clear: 1k for 5k games, 5k for 50k games. That's 20%.

Actually wait: 5k for 50k is 10%. 1k for 5k is 20%. These are inconsistent. Let me just use the explicit examples: 1k/5k = 20%, 5k/50k = 10%. Average could be ~15%, or the user might just want a flat 10% and miscalculated the 5k example. Given the 50k example is exactly 10%, I'll use 10% and note it.

**Fix**: Change threshold from `big_blind * 10` to `table.min_buy_in * 0.10` (10% of starting stack).

**File**: `src/components/poker/OnlinePokerTable.tsx`

---

## Summary of Files Changed

| File | Issue |
|------|-------|
| `src/components/poker/ConnectionOverlay.tsx` | Issue 1 -- replace hardcoded strings with t() |
| `src/i18n/locales/en.json` | Issue 1 -- add new translation keys |
| `src/i18n/locales/pl.json` | Issue 1 -- add Polish translations |
| `src/components/poker/OnlinePokerTable.tsx` | Issues 2, 3A, 4 -- delay winner voice, remove break, fix big pot threshold |
| `src/hooks/usePokerVoiceAnnouncements.ts` | Issue 3B/3C -- increase STALE_MS, fix queue not draining |

## What Does NOT Change

- No navigation, bottom nav, or layout changes
- No game engine, hand evaluation, or edge function changes
- No database schema changes

