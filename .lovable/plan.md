

# Fix: Emoji Display Duration & Self-Visibility

## Problem
1. Users may see duplicate bubbles (once from local add, once from broadcast echo) or none at all depending on channel config.
2. Bubbles disappear after 3 seconds -- too fast.

## Changes

### File: `src/hooks/useOnlinePokerTable.ts`

**Prevent duplicate bubbles from broadcast listener (line 254-261):**
- In the `chat_emoji` broadcast handler, skip adding the bubble if `payload.player_id === userId` (since `sendChat` already adds it locally).

**Increase all bubble durations from 3000ms to 4000ms:**
- Line 259: Change `3000` to `4000` (broadcast listener timeout).
- Line 410: Change `3000` to `4000` (local sender timeout).

That's it -- two small edits in one file.
