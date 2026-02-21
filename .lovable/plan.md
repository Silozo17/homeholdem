

# Fix: Winner Timing + End Game Landscape Layout

## Issue 1: Winner Shows Before Cards Are Dealt (ROOT CAUSE FOUND)

### Why the current fix doesn't work

The runout detection is broken because of event ordering:

1. Server sends `game_state` broadcast with 5 community cards
2. The `game_state` handler (line 230) immediately sets `prevCommunityAtResultRef.current = 5`
3. The staged runout effect in `OnlinePokerTable.tsx` starts slowly revealing cards (flop at 0ms, turn at 2000ms, river at 4000ms)
4. Server sends `hand_result` broadcast
5. `hand_result` handler checks: `prevCommunityAtResultRef.current < 5` -- but it's already 5!
6. `wasRunout = false`, so `winnerDelay = 0` -- winner shows IMMEDIATELY

The winner overlay, voice announcement, and confetti all fire before the staged cards finish dealing because the runout detection flag is already stale.

### The fix

Add a dedicated `wasRunoutRef` boolean in `useOnlinePokerTable.ts` that gets set in the `game_state` handler when a community card jump is detected, and consumed (read + reset) in the `hand_result` handler.

**File: `src/hooks/useOnlinePokerTable.ts`**

1. Add new ref: `const wasRunoutRef = useRef(false);`

2. In the `game_state` handler (around line 229-230), detect the jump BEFORE updating the count:
```typescript
const newCommunityCount = (payload.community_cards || []).length;
const oldCommunityCount = prevCommunityAtResultRef.current;
// Detect runout: community cards jumped by more than 1 in a single broadcast
if (newCommunityCount > oldCommunityCount + 1) {
  wasRunoutRef.current = true;
}
prevCommunityAtResultRef.current = newCommunityCount;
```

3. In the `hand_result` handler (lines 359-362), use the flag instead of re-computing:
```typescript
const winnerDelay = wasRunoutRef.current ? 5500 : 0;
wasRunoutRef.current = false; // Reset after use
```

4. Reset the flag on new hand (line 139):
```typescript
prevCommunityAtResultRef.current = 0;
wasRunoutRef.current = false;
```

This ensures the runout is detected at the moment the community cards jump (in `game_state`), and the delay is applied when the winner is determined (in `hand_result`), regardless of the order or timing of broadcasts.

---

## Issue 2: End Game Screen Cut Off in Mobile Landscape

The current `XPLevelUpOverlay` uses `max-w-sm` (384px) which doesn't use landscape width. On a phone rotated to landscape (e.g. 812x375), the content is forced into a narrow column, causing vertical overflow.

**File: `src/components/poker/XPLevelUpOverlay.tsx`**

Restructure the layout to use a two-column layout in landscape:

- Add landscape media query detection via the container
- In landscape: use `max-w-2xl` and split into two columns -- left column has XP header + level progress, right column has stats + buttons
- In portrait: keep current single-column layout
- Use `landscape:` Tailwind variants throughout:
  - Outer: `max-w-sm landscape:max-w-2xl`
  - Inner: `landscape:flex-row landscape:gap-6`
  - Stats + buttons: `landscape:flex-1`
  - XP header + level: `landscape:flex-1`
- Reduce vertical spacing in landscape: `py-4 landscape:py-2`
- Reduce margins and font sizes in landscape mode
- Ensure buttons always visible: `landscape:mt-auto` on button container

This uses CSS `@media (orientation: landscape)` which Tailwind supports via the `landscape:` variant -- no JS needed.

---

## Files Modified

| File | Change |
|------|--------|
| `src/hooks/useOnlinePokerTable.ts` | Add `wasRunoutRef` for reliable runout detection; set in `game_state`, consume in `hand_result` |
| `src/components/poker/XPLevelUpOverlay.tsx` | Two-column landscape layout to fit full screen width |

## What Does NOT Change

- No database, schema, or edge function changes
- No navigation or bottom nav changes
- No changes to staged runout timing (stays at 0/2000/4000ms)
- No changes to voice, confetti, or other previously-fixed issues
