

## Replace Voice Hook with Simplified Version

### File
`src/hooks/usePokerVoiceAnnouncements.ts` — full file replacement (only file changed)

### What gets simplified
- Remove: queue system (`queueRef`, `QueueItem`, `processQueue`, `enqueue`, `STALE_MS`)
- Remove: per-hand dedup Set (`announcedThisHandRef`)
- Remove: LRU cache refs (`cacheRef`, `cacheOrderRef`, `addToCache`)
- Replace with: single `speak()` function, module-level `Map` cache, `isPlayingRef` guard

### What stays the same
- All exported function names and signatures (no changes to OnlinePokerTable.tsx needed)
- `clearQueue` and `resetHandDedup` become no-ops (no queue/dedup to manage)
- `voiceEnabled` stays as `useState` for reactive UI rendering
- `toggleVoice` stays as toggle function
- `precache` keeps the `precachedRef` guard, fetches 4 common phrases
- Edge function (`tournament-announce`) is untouched
- Auth headers use `VITE_SUPABASE_PUBLISHABLE_KEY` as both `apikey` and `Authorization: Bearer` (matching existing codebase pattern)

### Core design
- `speak(message)` is the single entry point
- If already playing (`isPlayingRef.current`), new calls are silently dropped — no queuing
- Module-level `Map` cache (survives re-renders, cleared on page refresh), capped at 30 entries
- 5s fetch timeout via AbortController
- Failures log a warning and return silently

### Verification
1. All-in: other players hear "[Name] is all in", acting player hears nothing
2. Winner overlay: voice announces ~400ms later (delay controlled by OnlinePokerTable.tsx effect)
3. Game over screen: voice fires at same moment (controlled by OnlinePokerTable.tsx timer)
4. Sound dropdown: voice toggle icon updates reactively
5. Slow network: voice fails silently within 5s, gameplay never blocked
