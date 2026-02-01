
# Plan: Fix Native Web Push Notifications with VAPID

## Problem Summary

The push notification system is failing due to incorrect VAPID key conversion. The edge function tries to manually convert base64url keys to JWK format using `base64UrlToJwk()`, which produces an `invalid b64 coordinate` error when the library attempts to import them.

## Root Cause

The `@negrel/webpush` library's `importVapidKeys()` expects keys already in JWK format, but we're:
1. Storing keys as raw base64url strings (`VAPID_PRIVATE_KEY`, `VITE_VAPID_PUBLIC_KEY`)
2. Manually slicing bytes and converting to JWK - this is fragile and failing

## Solution

Store VAPID keys in native JWK format as a single JSON secret, then parse it directly - no manual conversion needed.

---

## Changes Required

### 1. Add New Secret: `VAPID_KEYS_JSON`

Store the full JWK keypair as a JSON string. This replaces the fragile conversion logic.

**Format:**
```json
{
  "publicKey": {
    "kty": "EC",
    "crv": "P-256", 
    "x": "...",
    "y": "...",
    "ext": true
  },
  "privateKey": {
    "kty": "EC",
    "crv": "P-256",
    "x": "...",
    "y": "...",
    "d": "...",
    "ext": true
  }
}
```

You'll generate these keys using the `@negrel/webpush` library's `generateVapidKeys()` and `exportVapidKeys()` functions.

---

### 2. Update Edge Function

**File:** `supabase/functions/send-push-notification/index.ts`

**Changes:**
- Remove `VAPID_PRIVATE_KEY` env variable
- Add `VAPID_KEYS_JSON` env variable
- Remove all manual conversion functions (`base64UrlToJwk`, `base64UrlDecode`, `bytesToBase64Url`)
- Parse the JSON and pass directly to `importVapidKeys()`

```typescript
// Before (broken)
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY")!;
const VAPID_PUBLIC_KEY = Deno.env.get("VITE_VAPID_PUBLIC_KEY")!;
const jwkKeys = base64UrlToJwk(VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

// After (simple)
const VAPID_KEYS_JSON = Deno.env.get("VAPID_KEYS_JSON")!;
const jwkKeys = JSON.parse(VAPID_KEYS_JSON);
const vapidKeys = await importVapidKeys(jwkKeys);
```

---

### 3. Update Frontend Hook

**File:** `src/hooks/usePushNotifications.ts`

**Changes:**
- Read public key from environment instead of hardcoding
- Add validation for missing key

```typescript
// Before (hardcoded)
const VAPID_PUBLIC_KEY = 'BHzqX_L6AG...';

// After (from environment)
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;
```

---

### 4. Create Key Generator (Temporary Edge Function)

**File:** `supabase/functions/generate-vapid-keys/index.ts` (NEW - temporary)

A one-time function to generate properly formatted VAPID keys:

```typescript
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { 
  generateVapidKeys, 
  exportVapidKeys, 
  exportApplicationServerKey 
} from "jsr:@negrel/webpush@0.5.0";

serve(async () => {
  const keys = await generateVapidKeys({ extractable: true });
  const exported = await exportVapidKeys(keys);
  const publicKeyB64 = await exportApplicationServerKey(keys);

  return new Response(JSON.stringify({
    VAPID_KEYS_JSON: JSON.stringify(exported),
    VITE_VAPID_PUBLIC_KEY: publicKeyB64,
  }, null, 2), {
    headers: { "Content-Type": "application/json" }
  });
});
```

**Usage:** Call this function once, copy the output to your secrets, then delete the function.

---

## Service Worker (Already Correct)

The `public/sw.js` is already properly configured:
- Listens for `push` event
- Parses JSON payload
- Calls `self.registration.showNotification()`
- Handles notification clicks

No changes needed.

---

## Frontend Hook (Already Mostly Correct)

The `src/hooks/usePushNotifications.ts` already:
- Registers the service worker
- Requests notification permission
- Subscribes using `pushManager.subscribe({ applicationServerKey })`
- Saves subscription to database with `p256dh_key` and `auth_key`

Only change: Read public key from environment.

---

## Migration Steps

1. **Create key generator function** - Deploy temporary edge function
2. **Generate new keys** - Call the function to get properly formatted JWK keys
3. **Update secrets:**
   - Add `VAPID_KEYS_JSON` (the full JWK JSON string)
   - Update `VITE_VAPID_PUBLIC_KEY` (the new base64url public key)
4. **Update edge function** - Remove conversion code, use `JSON.parse()`
5. **Update frontend hook** - Read from environment
6. **Test** - Subscribe and verify push arrives
7. **Clean up** - Delete generator function, optionally delete old `VAPID_PRIVATE_KEY`

---

## Existing Subscriptions

Changing VAPID keys will invalidate existing subscriptions. The edge function already handles this - failed sends are detected and those subscriptions are deleted from the database. Users will be re-prompted to subscribe when they next open the app.

---

## Files to Modify

| File | Action | Description |
|------|--------|-------------|
| `supabase/functions/generate-vapid-keys/index.ts` | CREATE | Temporary key generator |
| `supabase/functions/send-push-notification/index.ts` | MODIFY | Remove conversion, use JSON.parse |
| `src/hooks/usePushNotifications.ts` | MODIFY | Read VAPID key from env |

---

## Verification Checklist

After implementation:

| Check | How to verify |
|-------|---------------|
| Service worker active | DevTools → Application → Service Workers |
| Permission granted | `Notification.permission` returns `"granted"` |
| Subscription saved | Row appears in `push_subscriptions` table |
| Edge function returns 200 | Check logs after sending chat message |
| Push notification arrives | See visible notification on device |

---

## No OneSignal

This plan uses only:
- Native Web Push API
- `@negrel/webpush` library for server-side sending
- Custom service worker (`public/sw.js`)
- Supabase Edge Functions
- VAPID authentication

No OneSignal SDK, keys, or configuration required.
