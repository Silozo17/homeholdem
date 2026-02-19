

# Auto-Connect Voice Chat on Table Join

## What Changes

**File:** `src/components/poker/OnlinePokerTable.tsx`

Add a `useEffect` that automatically calls `voiceChat.connect()` when the player has a seat at the table. The green phone icon button will still be available as a fallback if the auto-connect fails (e.g., microphone permission denied), and players can still disconnect manually.

```typescript
// New useEffect — auto-connect voice chat when seated
useEffect(() => {
  if (mySeat && !voiceChat.connected && !voiceChat.connecting) {
    voiceChat.connect();
  }
}, [mySeat, voiceChat.connected, voiceChat.connecting]);
```

The mic will still start muted (existing behaviour in `useVoiceChat`), so players won't accidentally broadcast audio. They just need to unmute when ready to talk.

## What Does NOT Change
- `useVoiceChat` hook — no modifications
- `VoiceChatControls` — still shown for mic/deafen/disconnect controls
- No layout, styling, navigation, or seat changes
- Voice chat still auto-disconnects on leave (existing behaviour)
- Bottom nav untouched

