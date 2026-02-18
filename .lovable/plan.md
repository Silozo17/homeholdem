

# Fix: LiveKit API Credentials Are Invalid

## Root Cause (Confirmed)

I reproduced the issue by clicking the green call button myself. Here is exactly what happens:

1. The `livekit-token` edge function is called successfully (HTTP 200) and generates a JWT token
2. The `livekit-client` SDK then tries to connect to `wss://home-holdem-oun1zj5v.livekit.cloud` using that token
3. **LiveKit Cloud rejects the token with HTTP 401** -- "HTTP Authentication failed; no valid credentials available"

The token is signed with `LIVEKIT_API_KEY` and `LIVEKIT_API_SECRET`, but LiveKit Cloud does not recognise them. This means the stored secrets are either incorrect, expired, or belong to a different LiveKit project than the URL.

Console errors from the browser:
```
WebSocket connection to 'wss://home-holdem-oun1zj5v.livekit.cloud/rtc/v1?access_token=...' 
failed: HTTP Authentication failed; no valid credentials available

Failed to load resource: 401 - livekit.cloud/rtc/v1/validate
Failed to load resource: 401 - livekit.cloud/settings/regions
```

## Why Nothing Happens (No Visual Feedback)

The `useVoiceChat` hook catches the connection error silently with `console.error` -- there is no toast or UI feedback to the user. So the button appears to do nothing.

## Fix (Two Parts)

### Part 1: Update LiveKit Credentials (Required)

You need to verify and re-enter your LiveKit Cloud credentials. Go to your LiveKit Cloud dashboard at [cloud.livekit.io](https://cloud.livekit.io):

1. Open your project (the one with URL `wss://home-holdem-oun1zj5v.livekit.cloud`)
2. Go to **Settings** or **Keys**
3. Copy the **API Key** and **API Secret**
4. We will update the three secrets: `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`, and verify `LIVEKIT_URL` matches

If the project no longer exists or the keys were regenerated, you will need to create new keys.

### Part 2: Add Error Toast (Code Change)

In `src/hooks/useVoiceChat.ts`, add a user-facing toast notification when the connection fails, so the user knows something went wrong instead of seeing nothing:

```typescript
// In the catch block (line 112-113), add a toast:
} catch (err) {
  console.error('[VoiceChat] connect error:', err);
  toast({
    title: 'Voice Chat Error',
    description: 'Could not connect to voice chat. Please try again.',
    variant: 'destructive',
  });
}
```

## What Changes
- Update `LIVEKIT_API_KEY` and `LIVEKIT_API_SECRET` secrets (credentials fix)
- `src/hooks/useVoiceChat.ts` -- add error toast in the catch block (1 line addition)

## What Does NOT Change
- No UI layout, styling, or navigation changes
- No other files modified
- Bottom nav untouched
