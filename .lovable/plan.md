

# Fix Chat Bubble Clipping and All-In Voice Announcement

## Issue 1: Chat messages cut off for edge seats (seat 8 and others near edges)

Chat bubbles are positioned with `transform: translateX(-50%)` which centers them on the seat's X coordinate. For seats near the left or right edges (e.g., seat B at xPct=4-6%, seat F at xPct=94-96%, seat G at xPct=88-90%), half the bubble extends beyond the table container and gets clipped.

**Fix in `src/components/poker/OnlinePokerTable.tsx` (line 1309):**
- For seats on the right side (xPct > 70%), align the bubble to the right instead of centering: use `transform: translateX(-90%)` so the bubble extends leftward.
- For seats on the left side (xPct < 30%), align the bubble to the left: use `transform: translateX(-10%)`.
- For center seats, keep `translateX(-50%)`.

This ensures bubbles always extend inward toward the table center.

## Issue 2: All-in voice announcement not firing

The all-in detection code in `OnlinePokerTable.tsx` (line 443) checks:
```
actionStr === 'all_in' || actionStr === 'all-in'
```

But `lastActions` values are capitalized on ingestion (line 223 of `useOnlinePokerTable.ts`):
```
next[s.player_id] = raw.charAt(0).toUpperCase() + raw.slice(1);
```

This means the actual value is `"All_in"` or `"All-in"`, which never matches the lowercase check.

**Fix in `src/components/poker/OnlinePokerTable.tsx` (line 443):**
- Compare using `.toLowerCase()`: `actionStr.toLowerCase() === 'all_in' || actionStr.toLowerCase() === 'all-in'`

Additionally, the announcement should include the player's name for more excitement:
```
"All in! [PlayerName] is all in!"
```

## Files Changed

| File | Change |
|------|--------|
| `src/components/poker/OnlinePokerTable.tsx` | Fix case-sensitive all-in detection; adjust chat bubble transform based on seat xPct |

## What Is NOT Changed
- Bottom navigation, seat layout positions, betting controls, game logic
- No new files, no schema changes
- Voice announcement hook unchanged (already has "All in! We have an all in!" pre-cached)

## Technical Detail

Chat bubble transform logic:
```text
xPct < 30%  -> translateX(-10%)   (bubble extends rightward)
xPct > 70%  -> translateX(-90%)   (bubble extends leftward)
otherwise   -> translateX(-50%)   (centered)
```

All-in detection fix:
```typescript
const lower = actionStr.toLowerCase();
if (lower === 'all_in' || lower === 'all-in') {
  // ... announce
}
```
