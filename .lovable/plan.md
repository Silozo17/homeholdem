

# Comprehensive Plan: Push Notifications, Settings, Live Event Sync, and Data Fixes

## Executive Summary

This plan addresses multiple interconnected issues:
1. **Chat push notifications** - already implemented but need verification
2. **Push notification settings** - need to add missing settings in the UI
3. **Live event notifications** - ensure all game events trigger push notifications
4. **Live tournament mini-bar** - verify global synchronization (already working)
5. **Winnings rounding** - round values to nearest 10
6. **Admin panel negative amounts** - fix stats calculation bug

---

## Issue Analysis

### 1. Admin Panel Negative Winnings Bug

**Root Cause Found:** The `game_transactions` table stores payouts as **negative values** (see line 139 in `PayoutCalculator.tsx`):
```typescript
amount: -payout,  // <-- Stored as negative!
```

Current database data shows:
- Kryniu: payout amount = **-259** (should show as £259 won)
- Puchar: payout amount = **-221** (should show as £221 won)

The admin panel's `UserDetailSheet.tsx` (line 188) sums payout amounts directly:
```typescript
totalWinnings = transactions?.reduce((sum, t) => sum + (t.amount || 0), 0) || 0;
```
This results in negative totals because payouts are stored as negative values.

**Fix:** Use `Math.abs()` when summing payout transactions, OR correct the data model to store payouts as positive values going forward.

---

### 2. Missing Push Notification Settings in UI

**Current Database Columns (from types.ts):**
- `push_blinds_up` ✅ (in UI)
- `push_chat_messages` ✅ (in UI)
- `push_date_finalized` ✅ (in UI)
- `push_event_unlocked` ❌ (NOT in UI)
- `push_game_completed` ❌ (NOT in UI)
- `push_game_started` ✅ (in UI)
- `push_member_rsvp` ❌ (NOT in UI)
- `push_member_vote` ❌ (NOT in UI)
- `push_player_eliminated` ✅ (in UI)
- `push_rebuy_addon` ✅ (in UI)
- `push_rsvp_updates` ✅ (in UI)
- `push_waitlist_promotion` ✅ (in UI)

**Missing in UI but exist in DB:**
1. `push_event_unlocked` - When voting opens for new events
2. `push_game_completed` - When tournament finishes with winners
3. `push_member_rsvp` - When other members RSVP
4. `push_member_vote` - When other members vote on dates

---

### 3. Chat Notifications Status

**Already Implemented:** Chat messages trigger both in-app and push notifications in `ChatWindow.tsx` (lines 186-189):
```typescript
Promise.allSettled([
  notifyNewChatMessageInApp(...),
  notifyNewChatMessage(...),  // <-- Push notification!
]).catch(console.error);
```

The system uses a 5-minute throttle to prevent notification spam.

---

### 4. Live Tournament Mini-Bar Global Sync

**Already Working:** The `TournamentMiniBar.tsx` and `ActiveGameContext.tsx` implement proper global synchronization:
- Uses Supabase Realtime to subscribe to `game_sessions` changes (line 217)
- Timer uses drift-resistant calculation from `level_started_at` timestamp
- Recalculates on visibility change when app returns from background

---

### 5. Winnings Rounding

Need to round values like 351 → 350, 378 → 380 (to nearest 10).

---

## Files to Modify

### Part A: Fix Admin Panel Stats (Negative Winnings Bug)

**File:** `src/components/admin/UserDetailSheet.tsx`

Update `fetchUserStats` function (lines 182-188):
```typescript
// Change from:
totalWinnings = transactions?.reduce((sum, t) => sum + (t.amount || 0), 0) || 0;

// Change to:
totalWinnings = transactions?.reduce((sum, t) => sum + Math.abs(t.amount || 0), 0) || 0;
```

---

### Part B: Add Missing Push Notification Settings

**File:** `src/hooks/useUserPreferences.ts`

Add missing preference fields to the interface and defaults:
```typescript
export interface UserPreferences {
  // ... existing fields ...
  push_event_unlocked: boolean;
  push_game_completed: boolean;
  push_member_rsvp: boolean;
  push_member_vote: boolean;
}

const defaultPreferences = {
  // ... existing ...
  push_event_unlocked: true,
  push_game_completed: true,
  push_member_rsvp: true,
  push_member_vote: true,
};
```

**File:** `src/components/settings/PushNotificationPreferences.tsx`

Add settings rows for the missing notification types:
```typescript
<SettingRow
  id="push_game_completed"
  label={t('settings.game_completed')}
  description={t('settings.game_completed_description')}
  checked={preferences.push_game_completed ?? true}
  onCheckedChange={(v) => handleToggle('push_game_completed', v)}
/>
<SettingRow
  id="push_event_unlocked"
  label={t('settings.event_unlocked')}
  description={t('settings.event_unlocked_description')}
  checked={preferences.push_event_unlocked ?? true}
  onCheckedChange={(v) => handleToggle('push_event_unlocked', v)}
/>
<SettingRow
  id="push_member_rsvp"
  label={t('settings.member_rsvp')}
  description={t('settings.member_rsvp_description')}
  checked={preferences.push_member_rsvp ?? true}
  onCheckedChange={(v) => handleToggle('push_member_rsvp', v)}
/>
<SettingRow
  id="push_member_vote"
  label={t('settings.member_vote')}
  description={t('settings.member_vote_description')}
  checked={preferences.push_member_vote ?? true}
  onCheckedChange={(v) => handleToggle('push_member_vote', v)}
/>
```

**File:** `src/i18n/locales/en.json`

Add translation strings for new settings:
```json
{
  "settings": {
    "game_completed": "Game Results",
    "game_completed_description": "When a tournament finishes and winners are announced",
    "event_unlocked": "Event Unlocked",
    "event_unlocked_description": "When voting opens for a new event",
    "member_rsvp": "Member RSVPs",
    "member_rsvp_description": "When club members RSVP to events",
    "member_vote": "Member Votes",
    "member_vote_description": "When club members vote on event dates"
  }
}
```

---

### Part C: Round Winnings to Nearest 10

**File:** `src/components/clubs/Leaderboard.tsx`

Add rounding helper and apply to winnings display (line 331):
```typescript
// Helper function
const roundToNearest10 = (value: number) => Math.round(value / 10) * 10;

// In render:
{symbol}{roundToNearest10(player.total_winnings)}
```

**File:** `src/pages/Stats.tsx`

Apply same rounding to financial display (multiple locations):
```typescript
// Lines 389, 392, 403, 429
£{roundToNearest10(overallStats.totalWinnings)}
```

**File:** `src/components/admin/UserDetailSheet.tsx`

Apply rounding in admin panel stats display.

---

## Complete Push Notification Coverage

After reviewing all notification types, here's the complete matrix:

| Notification Type | Push | In-App | Settings UI |
|-------------------|------|--------|-------------|
| RSVP Updates | ✅ | ✅ | ✅ |
| Date Finalized | ✅ | ✅ | ✅ |
| Waitlist Promotion | ✅ | ✅ | ✅ |
| Chat Messages | ✅ | ✅ | ✅ |
| Blinds Up | ✅ | ❌ | ✅ |
| Host Confirmed | ✅ | ✅ | via RSVP |
| Game Completed | ✅ | ✅ | ❌ (add) |
| Event Unlocked | ✅ | ✅ | ❌ (add) |
| Game Started | ✅ | ✅ | ✅ |
| Player Eliminated | ✅ | ✅ | ✅ |
| Rebuy/Add-on | ✅ | ✅ | ✅ |
| Member RSVP | ✅ | ✅ | ❌ (add) |
| Member Vote | ✅ | ✅ | ❌ (add) |
| Broadcast | ✅ | ✅ | via RSVP |

---

## Technical Details

### Live Event Sync Verification

The current implementation in `ActiveGameContext.tsx` provides proper global synchronization:

1. **Real-time subscription** (line 217-262):
   - Subscribes to `game_sessions` table changes
   - Filters by user's club membership
   - Updates all clients when game status changes

2. **Drift-resistant timer** (`TournamentMiniBar.tsx` lines 12-31):
   - Uses `level_started_at` timestamp as source of truth
   - Calculates elapsed time on each render
   - Recalculates when app returns from background

3. **Multi-user sync** (lines 269-324):
   - Subscribes to `game_players` and `game_transactions` changes
   - Updates player count and prize pool in real-time

---

## Implementation Order

1. **Fix admin panel negative winnings** (critical bug fix)
2. **Add missing push notification settings to UI**
3. **Add translations for new settings**
4. **Add winnings rounding**
5. **Verify live event sync** (already working, just needs testing)

---

## Testing Recommendations

After implementation:
1. View a user in admin panel to verify positive winnings display
2. Toggle each notification setting and verify saves correctly
3. Start a game and verify:
   - Mini-bar appears for all club members
   - Timer syncs across devices
   - Push notifications fire for game events
4. Check leaderboards show rounded values

