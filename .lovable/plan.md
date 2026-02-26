
# Fix: Deafen (Mute All) Button Not Working

## Root Cause

The deafen toggle sets `el.volume = 0` on audio elements created by LiveKit's `track.attach()`. However, these are WebRTC-backed `<audio>` elements, and on many browsers (especially mobile Safari/iOS), setting `volume = 0` on WebRTC audio elements has no effect. The `volume` property is often ignored or not fully supported for WebRTC streams.

## Fix (1 file, 2 locations)

### `src/hooks/useVoiceChat.ts`

**Change A** -- In `toggleDeafen` (~line 163), use `el.muted` instead of `el.volume`:

```typescript
audioElementsRef.current.forEach((el) => {
  el.muted = newDeafened;
});
```

**Change B** -- In the `TrackSubscribed` handler (~line 97), respect deafen state using `muted` instead of `volume`:

```typescript
el.muted = deafenedRef.current;
```

## Why This Works

The `HTMLMediaElement.muted` property is universally supported and works reliably with WebRTC audio streams across all browsers, including iOS Safari. Unlike `volume`, `muted` directly controls the audio output at the browser level.

## No Changes To

- Other voice chat controls (mic toggle, connect/disconnect)
- Bottom navigation, styles, layout, or spacing
- Any other files
