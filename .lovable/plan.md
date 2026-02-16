

# Fix: Next Hand Not Starting, Deal Animation Speed, Emoji Display

---

## Issue 1: Next Hand Doesn't Start After Showdown

**Root cause**: The auto-deal logic (line 382) uses `autoStartAttemptedRef` (a ref) to prevent duplicate starts. After showdown, the 5-second timer (line 242-252) resets `autoStartAttemptedRef.current = false`. However, since refs don't trigger React re-renders, the `useEffect` at line 382 never re-runs -- its dependencies (`seatedCount`, `hasActiveHand`, `mySeatNumber`, `startHand`) haven't changed, so the effect is stale.

**Fix in `src/hooks/useOnlinePokerTable.ts`**:
- Replace `autoStartAttemptedRef` with a state variable (`autoStartAttempted`) so that setting it to `false` triggers a re-render.
- This causes the auto-deal `useEffect` to re-evaluate and call `startHand()` after the showdown pause.

---

## Issue 2: Deal Animation Too Fast

**Root cause**: The animation uses `0.4s` duration and `0.18s` inter-card delay. Slowing by 35% means multiplying durations by ~1.35.

**Fix in `src/components/poker/OnlinePokerTable.tsx`**:
- Change deal animation duration from `0.4s` to `0.54s` (line 646).
- Change inter-card delay from `0.18s` to `0.243s` (line 637).
- Extend the `dealing` state timeout from `2000ms` to `3000ms` (line 218) to accommodate the slower animation.

---

## Issue 3: Emojis Not Displaying

**Root cause**: `sendChat` uses `channelRef.current.send()` to broadcast a `chat_emoji` event. By default, Supabase Realtime does **not** echo broadcasts back to the sender. So:
- The sender never sees their own emoji.
- Other players DO receive it (if they're subscribed), but only the sender-side is broken from the sender's perspective.

Actually, there's a second issue: if only two people are playing and testing from the same perspective, nobody sees anything because the channel needs `config: { broadcast: { self: true } }` or the sender must manually add the bubble locally.

**Fix in `src/hooks/useOnlinePokerTable.ts`**:
- In the `sendChat` callback, after broadcasting, also add the bubble to `chatBubbles` locally (same logic as the listener). This ensures the sender always sees their own message immediately, regardless of Supabase echo settings.

---

## Summary

| # | Issue | File | Change |
|---|-------|------|--------|
| 1 | Next hand stuck on "Starting soon" | `useOnlinePokerTable.ts` | Replace `autoStartAttemptedRef` with state |
| 2 | Deal animation too fast | `OnlinePokerTable.tsx` | Multiply durations by 1.35 |
| 3 | Emojis invisible | `useOnlinePokerTable.ts` | Add local bubble on send |

