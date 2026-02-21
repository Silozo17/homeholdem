

# Fix: Voice Announcements Repeating

## Root Cause

The current dedup in `usePokerVoiceAnnouncements.ts` only tracks the **last single message** with a 3-second window (`lastAnnouncedRef`). This fails when:

1. Multiple React effects re-fire and call `announceGameOver` or `announceCustom` again with the same text -- the 3s window has passed, so it gets enqueued again.
2. The `announceGameOver` calls at lines 676, 689, and 715 in `OnlinePokerTable.tsx` can each fire independently from different `useEffect` blocks (loser detection, winner detection, opponent-left detection), causing duplicate "Game over" announcements.
3. Winner announcements at line 537 re-fire when `handWinners` array reference changes due to state updates even though the content is the same.

## Fix

### 1. Replace single-message dedup with a per-hand Set (`usePokerVoiceAnnouncements.ts`)

Replace `lastAnnouncedRef` (tracks 1 message for 3s) with `announcedThisHandRef` (a `Set<string>` that tracks ALL messages announced in the current hand). Once a message is spoken, it can never repeat until `clearQueue()` is called (which happens on every new hand).

- Remove `lastAnnouncedRef` and `DEDUP_MS`
- Add `announcedThisHandRef = useRef(new Set<string>())`
- In `enqueue`: skip if `announcedThisHandRef.current.has(message)`; otherwise add it
- In `clearQueue`: also clear `announcedThisHandRef.current`

### 2. Also deduplicate items already in the queue (`usePokerVoiceAnnouncements.ts`)

Before pushing to the queue, check if the same message is already queued (prevents double-enqueue from rapid effect re-fires).

## Technical Details

**File: `src/hooks/usePokerVoiceAnnouncements.ts`**

```typescript
// Replace:
const lastAnnouncedRef = useRef<{ msg: string; at: number }>({ msg: '', at: 0 });
const DEDUP_MS = 3000;

// With:
const announcedThisHandRef = useRef(new Set<string>());

// In enqueue:
const enqueue = useCallback((message: string) => {
  if (!voiceEnabled) return;
  // Never repeat same message within a hand
  if (announcedThisHandRef.current.has(message)) return;
  // Also skip if already in queue
  if (queueRef.current.some(q => q.message === message)) return;
  announcedThisHandRef.current.add(message);
  queueRef.current.push({ message, addedAt: Date.now() });
  processQueue();
}, [voiceEnabled, processQueue]);

// In clearQueue:
const clearQueue = useCallback(() => {
  queueRef.current = [];
  announcedThisHandRef.current.clear();
}, []);
```

## Files Modified

| File | Change |
|------|--------|
| `src/hooks/usePokerVoiceAnnouncements.ts` | Replace single-message dedup with per-hand Set; add queue dedup; clear Set on `clearQueue` |

## What Does NOT Change

- No changes to `OnlinePokerTable.tsx` or any other file
- No database, navigation, or layout changes
- No changes to timing, confetti, or any other logic

