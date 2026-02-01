

# Plan: Fix Push Notification Base64 Encoding Mismatch

## Problem Identified

The error from the edge function logs:
```
TypeError: Cannot decode input as base64: Invalid character (+)
```

The `@negrel/webpush` library expects **base64url** encoding for the subscription keys (p256dh and auth), but the frontend is storing them in **standard base64** format.

| Encoding | Characters |
|----------|------------|
| Standard base64 | Uses `+` and `/` |
| Base64url | Uses `-` and `_` |

---

## Solution

Convert the keys from standard base64 to base64url format. This can be fixed in either location:

1. **Frontend** (preferred): Store keys in base64url format when subscribing
2. **Backend**: Convert from base64 to base64url before using

I recommend fixing it in the **frontend** since that's where keys are generated, and future subscriptions will be stored correctly.

---

## Files to Modify

### 1. Frontend Hook: `src/hooks/usePushNotifications.ts`

Add a helper function to convert ArrayBuffer to base64url and use it when storing the subscription keys:

```typescript
// Helper to convert ArrayBuffer to base64url (not standard base64)
function arrayBufferToBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  // Convert to base64, then to base64url
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}
```

Update the subscribe function to use this helper:
```typescript
// Convert to base64url (required by webpush library)
const p256dhBase64 = arrayBufferToBase64Url(p256dh);
const authBase64 = arrayBufferToBase64Url(auth);
```

---

## Existing Subscriptions

Since Amir's subscription was stored with the wrong encoding, we need to either:
1. Have him re-subscribe (disable then enable notifications), or
2. Run a one-time migration to convert existing keys

The simplest fix is to have affected users toggle notifications off and on again.

---

## Technical Summary

| Location | Current | Fixed |
|----------|---------|-------|
| `usePushNotifications.ts` line 157-158 | `btoa()` → standard base64 | `arrayBufferToBase64Url()` → base64url |

---

## Implementation Steps

1. Add `arrayBufferToBase64Url` helper function
2. Update the `subscribe` function to use the new helper
3. Test by having Amir disable and re-enable notifications
4. Verify push notification delivery works

