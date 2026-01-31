

## Plan: Auto-Enable Push Notification Prompt on App Launch

### Overview
Automatically prompt users for push notification permission when they open the PWA app. The browser's native permission dialog will appear, and users can accept or decline. All push notification types will be enabled by default in user preferences. Users can control notification settings through their device's system settings after granting permission.

---

### Part 1: Create Auto-Prompt Component

**New File: `src/components/pwa/PushNotificationPrompt.tsx`**

This component will:
1. Check if the user is logged in
2. Check if push notifications are supported
3. Check if permission hasn't been requested yet (or is 'default')
4. Automatically trigger the browser's native permission prompt
5. If granted, automatically subscribe and save to database
6. Only runs once per session (using sessionStorage flag to prevent repeated prompts)

```typescript
// Key implementation logic:
import { useEffect, useRef } from 'react';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useAuth } from '@/contexts/AuthContext';

export function PushNotificationPrompt() {
  const { user } = useAuth();
  const { isSupported, isSubscribed, permission, loading, subscribe } = usePushNotifications();
  const hasPrompted = useRef(false);

  useEffect(() => {
    // Don't prompt if:
    // - Still loading
    // - Not supported
    // - Already subscribed
    // - Permission already denied (user can't change this programmatically)
    // - Already prompted this session
    // - No user logged in
    if (loading || !isSupported || isSubscribed || permission === 'denied' || hasPrompted.current || !user) {
      return;
    }

    // Check if we've already prompted this session
    const sessionPrompted = sessionStorage.getItem('push-notification-prompted');
    if (sessionPrompted) return;

    // Small delay to let the app stabilize after login
    const timer = setTimeout(async () => {
      hasPrompted.current = true;
      sessionStorage.setItem('push-notification-prompted', 'true');
      
      // This will trigger the browser's native permission dialog
      await subscribe();
    }, 2000);

    return () => clearTimeout(timer);
  }, [user, isSupported, isSubscribed, permission, loading, subscribe]);

  // This component renders nothing - it just triggers the prompt
  return null;
}
```

---

### Part 2: Integrate Auto-Prompt into App

**Update: `src/App.tsx`**

Add the `PushNotificationPrompt` component after `AuthProvider` so it has access to the user context:

```typescript
import { PushNotificationPrompt } from '@/components/pwa/PushNotificationPrompt';

// In the App component:
<AuthProvider>
  <TooltipProvider>
    <Toaster />
    <Sonner />
    <BrowserRouter>
      <ScrollToTop />
      <PushNotificationPrompt />  // <-- Add here
      <AppLayout>
        {/* routes */}
      </AppLayout>
      <InstallPrompt />
    </BrowserRouter>
  </TooltipProvider>
</AuthProvider>
```

---

### Part 3: Update usePushNotifications Hook

**Update: `src/hooks/usePushNotifications.ts`**

Add a new `subscribeQuietly` function that doesn't throw errors but silently handles rejections:

```typescript
// Add a silent subscribe option for auto-prompt
const subscribeQuietly = useCallback(async () => {
  if (!user || !VAPID_PUBLIC_KEY || !isSupported) {
    return false;
  }

  // Don't even try if already subscribed or permission denied
  if (permission === 'denied') {
    return false;
  }

  try {
    // Request permission - this shows the browser's native prompt
    const permissionResult = await Notification.requestPermission();
    
    if (permissionResult !== 'granted') {
      setState(prev => ({ ...prev, permission: permissionResult }));
      return false;
    }

    // If granted, proceed with subscription
    return await subscribe();
  } catch (error) {
    console.error('Auto push subscription failed:', error);
    return false;
  }
}, [user, isSupported, permission, subscribe]);

// Export it
return {
  ...state,
  subscribe,
  subscribeQuietly,  // <-- For auto-prompt
  unsubscribe,
};
```

---

### Part 4: Ensure Default Preferences Enable All Push Types

The current `useUserPreferences.ts` already has all push preferences defaulting to `true`. No changes needed here as the database defaults are already:

```typescript
const defaultPreferences = {
  push_rsvp_updates: true,
  push_date_finalized: true,
  push_waitlist_promotion: true,
  push_chat_messages: true,
  push_blinds_up: true,
  // New ones from recent migration
  push_game_completed: true,
  push_event_unlocked: true,
  push_member_rsvp: true,
  push_member_vote: true,
};
```

---

### Part 5: Summary of Changes

| File | Change |
|------|--------|
| **New** `src/components/pwa/PushNotificationPrompt.tsx` | Auto-prompt component that triggers permission dialog on app launch |
| `src/App.tsx` | Import and add `PushNotificationPrompt` component |
| `src/hooks/usePushNotifications.ts` | Add `subscribeQuietly` function for silent auto-subscription |

---

### User Experience Flow

```text
User opens PWA app
        │
        ▼
  User logged in?  ──No──▶  Do nothing
        │
       Yes
        ▼
  Push supported?  ──No──▶  Do nothing
        │
       Yes
        ▼
Already subscribed? ──Yes──▶ Do nothing
        │
       No
        ▼
 Permission denied? ──Yes──▶ Do nothing (can't override)
        │
       No
        ▼
Already prompted this session? ──Yes──▶ Do nothing
        │
       No
        ▼
  Wait 2 seconds for app to stabilize
        │
        ▼
  Show browser's native permission prompt
        │
        ├── User clicks "Allow" ──▶ Subscribe and save to DB
        │
        └── User clicks "Block/Deny" ──▶ Save permission state, won't prompt again
```

---

### Notes

1. **Session-based prompting**: Uses `sessionStorage` so users only see the prompt once per browser session. If they close and reopen the app, they'll see it again (only if they haven't already subscribed or denied).

2. **Graceful degradation**: If the user denies permission, we save this state and won't try again. The Settings page still shows the "blocked" state with instructions.

3. **iOS Safari limitation**: The prompt will only work on iOS if the app is added to the home screen and opened in standalone mode - this is a platform limitation.

4. **2-second delay**: Gives the app time to fully load and prevents the prompt from appearing during initial login flow.

