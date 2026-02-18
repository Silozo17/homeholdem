

# Fix: LiveKit Token Edge Function Crash

## Root Cause

The `livekit-token` edge function crashes on line 31 with `TypeError: supabase.auth.getClaims is not a function`. This method does not exist in the Supabase JS client. The correct way to authenticate the user from the Bearer token is `supabase.auth.getUser()`.

## Fix

### `supabase/functions/livekit-token/index.ts` (lines 30-39)

Replace the broken `getClaims` call with the standard `getUser()` pattern used by all other edge functions in this project:

```typescript
// Before (broken):
const token = authHeader.replace("Bearer ", "");
const { data: claimsData, error: claimsErr } = await supabase.auth.getClaims(token);
if (claimsErr || !claimsData?.claims) { ... }
const userId = claimsData.claims.sub as string;

// After (working):
const { data: { user }, error: userErr } = await supabase.auth.getUser();
if (userErr || !user) {
  return new Response(JSON.stringify({ error: "Unauthorized" }), {
    status: 401,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
const userId = user.id;
```

## What Changes
- One file: `supabase/functions/livekit-token/index.ts`
- Redeploy the edge function

## What Does NOT Change
- No UI changes, no styling, no other files

