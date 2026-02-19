

# Fix Sound Effects + Unified Audio Menu from Speaker Icon

## Problem 1: Sound effects stop working
The Web Audio API `AudioContext` can get suspended by the browser (especially iOS Safari) after a period without user interaction. The current code tries to `resume()` but only when `play()` is called — if the context enters a `closed` state or gets garbage-collected, sounds silently fail. Also, each `play()` call creates oscillators without error handling, so a single failure can cascade.

## Problem 2: Voice announcements toggle is hidden
The AI voice toggle currently shows as a Mic/MicOff icon on desktop (easily confused with voice chat mic) and is buried inside the 3-dot menu on mobile landscape. Players cannot easily find or understand it.

## Solution

### 1. Replace the speaker button with a dropdown menu (both tables)

Replace the single Volume2/VolumeX button with a `DropdownMenu` triggered by the same speaker icon. The menu will have two toggle rows:

- **Sound Effects** — on/off (controls `usePokerSounds`)
- **Voice Announcements** — on/off (controls `usePokerVoiceAnnouncements`) *(online table only)*

The speaker icon will show Volume2 when either is on, VolumeX when both are off.

### 2. Fix AudioContext reliability

In `usePokerSounds.ts`, add defensive handling:
- Wrap each `play()` call in try/catch so one failure doesn't break future sounds
- Create a fresh AudioContext if the existing one is in `closed` state
- Add a user-interaction listener (once) to resume suspended contexts on iOS

### 3. Remove the standalone voice toggle button

On the online table (desktop view, lines 1144-1149), remove the standalone Mic/MicOff voice toggle button since it now lives inside the speaker dropdown. In the mobile landscape 3-dot menu, also remove the voice toggle entry (lines 1095-1098) since it's now in the speaker menu.

---

## Files changed

### `src/hooks/usePokerSounds.ts`
- Wrap the `play()` function body in a try/catch to prevent silent failures
- In `ensureContext()`, also handle the case where `ctxRef.current.state === 'closed'` by creating a new context
- Add a one-time user interaction listener (`click`/`touchstart`) that resumes a suspended context

### `src/components/poker/OnlinePokerTable.tsx`
**Lines 1050-1056** — Replace the simple speaker `<button>` with a `DropdownMenu`:
```
<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <button ...>
      {(soundEnabled || voiceEnabled) ? <Volume2 /> : <VolumeX />}
    </button>
  </DropdownMenuTrigger>
  <DropdownMenuContent>
    <DropdownMenuItem onClick={toggleSound}>
      Sound Effects {soundEnabled ? 'On' : 'Off'}
    </DropdownMenuItem>
    <DropdownMenuItem onClick={toggleVoice}>
      Voice Announcements {voiceEnabled ? 'On' : 'Off'}
    </DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

**Lines 1144-1149** (desktop non-landscape) — Remove the standalone voice toggle button (Mic/MicOff icon).

**Lines 1095-1098** (mobile landscape 3-dot menu) — Remove the voice toggle `DropdownMenuItem` since it is now in the speaker menu.

### `src/components/poker/PokerTablePro.tsx`
**Lines 323-325** — Replace the simple speaker button with the same dropdown pattern, but only with "Sound Effects" toggle (no voice announcements in practice mode).

---

## What does NOT change
- Bottom navigation
- Voice chat controls (VoiceChatControls component) — unchanged
- PlayerSeat, PlayerProfileDrawer — unchanged
- No database changes
- No edge function changes

