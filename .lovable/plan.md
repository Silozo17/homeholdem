

# Fix: Voice Chat Connection Failures

## Root Cause

Two issues are causing connection failures:

1. **Mic permission crash**: After successfully connecting to the LiveKit room, the code calls `setMicrophoneEnabled(true)` then immediately `setMicrophoneEnabled(false)` (to "start muted"). If the browser blocks mic access, this throws an error and crashes the entire connection -- even though the room itself connected fine. This is likely what happened to Tomek.

2. **Retry loop not fully stopped**: The auto-connect `useEffect` depends on `voiceChat.connected`, `voiceChat.connecting`, and `voiceChat.failed` -- all of which change every render, re-triggering the effect. The `failed` flag helps but doesn't fully prevent rapid re-fires.

## Fix

### File: `src/hooks/useVoiceChat.ts`

**Change 1 -- Wrap mic enable/disable in try-catch (lines 109-112)**

Instead of crashing the whole connection when mic permission is denied, catch the error and continue connected (just without mic). The player can still hear others.

```typescript
// Current (crashes if mic denied):
await room.localParticipant.setMicrophoneEnabled(true);
await room.localParticipant.setMicrophoneEnabled(false);
setMicMuted(true);

// New (graceful fallback):
try {
  await room.localParticipant.setMicrophoneEnabled(true);
  await room.localParticipant.setMicrophoneEnabled(false);
} catch (micErr) {
  console.warn('[VoiceChat] Mic permission denied, joining listen-only:', micErr);
}
setMicMuted(true);
```

**Change 2 -- Add a `connectAttemptedRef` guard (new ref)**

Add a ref that tracks whether auto-connect has already been attempted for this session, preventing re-fires from useEffect dependency changes.

```typescript
const connectAttemptedRef = useRef(false);
```

In the `connect` function, set `connectAttemptedRef.current = true` at the start (before the try block). Reset it only on explicit manual retry.

### File: `src/components/poker/OnlinePokerTable.tsx`

**Change 3 -- Stabilise the auto-connect effect (line 178-183)**

Use a one-shot ref to ensure auto-connect fires exactly once per seat assignment, regardless of how many times the effect re-runs.

```typescript
const voiceChatAttemptedRef = useRef(false);

useEffect(() => {
  if (mySeatNumber !== null && !voiceChatAttemptedRef.current) {
    voiceChatAttemptedRef.current = true;
    voiceChat.connect();
  }
}, [mySeatNumber]);
```

Reset the ref when the player leaves the table (so re-seating triggers a new auto-connect).

## What Does NOT Change
- VoiceChatControls component -- untouched
- Manual connect/disconnect buttons -- still work
- Seat positions, dealer, bottom nav -- untouched
- No layout or styling changes

## Summary

| File | Change |
|---|---|
| `src/hooks/useVoiceChat.ts` | Wrap mic enable in try-catch so mic-denied doesn't crash the connection |
| `src/hooks/useVoiceChat.ts` | Add `connectAttemptedRef` to prevent double-connect |
| `src/components/poker/OnlinePokerTable.tsx` | Use one-shot ref for auto-connect effect, remove unstable dependencies |

