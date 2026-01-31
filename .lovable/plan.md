

## Plan: Live Tournament Notifications & Activity Feed

### Overview
This plan adds comprehensive live notifications for all tournament events and a real-time activity feed on the game page, so all club members stay informed about tournament progress.

---

### Part 1: Add New Notification Types

#### Database Changes
Add new notification type to the push notification edge function and new preference columns:

**SQL Migration:**
```sql
-- Add new push notification preferences for game events
ALTER TABLE user_preferences 
ADD COLUMN IF NOT EXISTS push_game_started boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS push_player_eliminated boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS push_rebuy_addon boolean DEFAULT true;
```

**File: `supabase/functions/send-push-notification/index.ts`**
Update the notification_type union to include new types:
- `game_started`
- `player_eliminated`
- `rebuy_addon`

---

### Part 2: Create Notification Helper Functions

**File: `src/lib/push-notifications.ts`**

Add new functions:
```typescript
export async function notifyGameStarted(
  userIds: string[],
  eventTitle: string,
  eventId: string
) {
  return sendPushNotification({
    userIds,
    title: 'Tournament Started',
    body: `${eventTitle} is now underway!`,
    url: `/event/${eventId}/game`,
    tag: `game-started-${eventId}`,
    notificationType: 'game_started',
  });
}

export async function notifyPlayerEliminated(
  userIds: string[],
  playerName: string,
  position: number,
  playersRemaining: number,
  eventId: string
) {
  const suffix = getOrdinalSuffix(position);
  return sendPushNotification({
    userIds,
    title: 'Player Out',
    body: `${playerName} finished ${position}${suffix} • ${playersRemaining} remaining`,
    url: `/event/${eventId}/game`,
    tag: `elimination-${eventId}`,
    notificationType: 'player_eliminated',
  });
}

export async function notifyRebuyAddon(
  userIds: string[],
  playerName: string,
  type: 'rebuy' | 'addon',
  prizePool: number,
  currencySymbol: string,
  eventId: string
) {
  return sendPushNotification({
    userIds,
    title: type === 'rebuy' ? 'Rebuy Added' : 'Add-on Added',
    body: `${playerName} ${type === 'rebuy' ? 'rebought' : 'added on'} • Pool: ${currencySymbol}${prizePool}`,
    url: `/event/${eventId}/game`,
    tag: `transaction-${eventId}`,
    notificationType: 'rebuy_addon',
  });
}
```

**File: `src/lib/in-app-notifications.ts`**

Add matching in-app notification functions:
```typescript
export async function notifyGameStartedInApp(
  userIds: string[],
  eventTitle: string,
  eventId: string,
  clubId: string
)

export async function notifyPlayerEliminatedInApp(
  userIds: string[],
  playerName: string,
  position: number,
  playersRemaining: number,
  eventId: string,
  clubId: string
)

export async function notifyRebuyAddonInApp(
  userIds: string[],
  playerName: string,
  type: 'rebuy' | 'addon',
  prizePool: number,
  currencySymbol: string,
  eventId: string,
  clubId: string
)
```

---

### Part 3: Create Game Activity Log System

**Database: New Table**
```sql
CREATE TABLE game_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_session_id uuid REFERENCES game_sessions(id) ON DELETE CASCADE,
  activity_type text NOT NULL, -- 'game_started', 'player_eliminated', 'rebuy', 'addon', 'blinds_up', 'break_start', 'break_end', 'game_completed'
  player_id uuid REFERENCES game_players(id),
  player_name text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Enable realtime for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE game_activity_log;

-- RLS policy
ALTER TABLE game_activity_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Club members can view game activity" ON game_activity_log
  FOR SELECT USING (is_game_session_club_member(auth.uid(), game_session_id));
```

---

### Part 4: Trigger Notifications at Key Points

**File: `src/pages/GameMode.tsx`**

When tournament starts (in `handleStartGame`):
```typescript
const handleStartGame = async () => {
  if (!session) {
    const newSession = await createSession();
    if (newSession) {
      // Notify all club members
      const memberIds = await getClubMemberIds(clubId);
      await Promise.all([
        notifyGameStarted(memberIds, eventTitle, eventId),
        notifyGameStartedInApp(memberIds, eventTitle, eventId, clubId),
        logGameActivity(newSession.id, 'game_started', null, { eventTitle }),
      ]);
    }
  }
};
```

**File: `src/components/game/PlayerList.tsx`**

When player eliminated:
```typescript
const handleEliminatePlayer = async (player: GamePlayer) => {
  // ... existing elimination logic ...
  
  // After successful elimination:
  const memberIds = await getClubMemberIds(clubId);
  await Promise.all([
    notifyPlayerEliminated(memberIds, player.display_name, finishPosition, remainingCount, eventId),
    notifyPlayerEliminatedInApp(memberIds, player.display_name, finishPosition, remainingCount, eventId, clubId),
    logGameActivity(sessionId, 'player_eliminated', player.id, {
      position: finishPosition,
      playersRemaining: remainingCount,
    }),
  ]);
};
```

**File: `src/components/game/BuyInTracker.tsx`**

When rebuy/addon added:
```typescript
const handleAddTransaction = async () => {
  // ... existing transaction logic ...
  
  // After successful insert:
  if (transactionType === 'rebuy' || transactionType === 'addon') {
    const memberIds = await getClubMemberIds(clubId);
    const newPrizePool = calculatePrizePool();
    await Promise.all([
      notifyRebuyAddon(memberIds, player.display_name, transactionType, newPrizePool, currencySymbol, eventId),
      notifyRebuyAddonInApp(memberIds, player.display_name, transactionType, newPrizePool, currencySymbol, eventId, clubId),
      logGameActivity(sessionId, transactionType, playerId, {
        amount: session[`${transactionType}_amount`],
        prizePool: newPrizePool,
      }),
    ]);
  }
};
```

**File: `src/components/game/TournamentClock.tsx`**

When blinds go up:
```typescript
useEffect(() => {
  if (prevLevelRef.current !== session.current_level && isAdmin) {
    // ... existing announcement logic ...
    
    // Log activity and send notifications
    const memberIds = await getClubMemberIds(clubId);
    if (currentLevel?.is_break) {
      await logGameActivity(sessionId, 'break_start', null, { level: currentLevel.level });
    } else {
      await Promise.all([
        notifyBlindsUp(memberIds, currentLevel.small_blind, currentLevel.big_blind, currentLevel.ante),
        logGameActivity(sessionId, 'blinds_up', null, {
          level: currentLevel.level,
          smallBlind: currentLevel.small_blind,
          bigBlind: currentLevel.big_blind,
          ante: currentLevel.ante,
        }),
      ]);
    }
  }
}, [session.current_level]);
```

---

### Part 5: Create Activity Feed Component

**New File: `src/components/game/ActivityFeed.tsx`**

```typescript
interface ActivityFeedProps {
  sessionId: string;
}

export function ActivityFeed({ sessionId }: ActivityFeedProps) {
  const [activities, setActivities] = useState<Activity[]>([]);
  
  // Fetch initial activities
  useEffect(() => {
    fetchActivities();
  }, [sessionId]);
  
  // Subscribe to realtime updates
  useEffect(() => {
    const channel = supabase
      .channel(`activity-${sessionId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'game_activity_log',
        filter: `game_session_id=eq.${sessionId}`,
      }, (payload) => {
        setActivities(prev => [payload.new as Activity, ...prev]);
      })
      .subscribe();
    
    return () => supabase.removeChannel(channel);
  }, [sessionId]);
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Live Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-64">
          {activities.map((activity) => (
            <ActivityItem key={activity.id} activity={activity} />
          ))}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
```

**Activity Item Component:**
Each activity type displays differently:
- 🎮 Tournament Started - "Game began at 7:30 PM"
- 💥 Player Out - "Alex finished 5th (8 remaining)"
- 💰 Rebuy - "Mike added rebuy (Pool: £300)"
- ⬆️ Blinds Up - "Level 5: 100/200 (ante 25)"
- ☕ Break - "15 min break started"
- 🏆 Game Over - "Winner: John!"

---

### Part 6: Add Activity Feed to Game Page

**File: `src/pages/GameMode.tsx`**

Add a new tab for the activity feed:
```typescript
<TabsList className="grid grid-cols-4 gap-1 h-auto p-1">
  <TabsTrigger value="players">Players</TabsTrigger>
  <TabsTrigger value="buyins">Buy-ins</TabsTrigger>
  <TabsTrigger value="activity">Activity</TabsTrigger>
  <TabsTrigger value="payouts">Payouts</TabsTrigger>
</TabsList>

<TabsContent value="activity">
  <ActivityFeed sessionId={session.id} />
</TabsContent>
```

---

### Part 7: Update User Preferences UI

**File: `src/components/settings/PushNotificationPreferences.tsx`**

Add toggles for new notification types:
```typescript
<SettingRow
  id="push_game_started"
  label="Tournament Started"
  description="When a game begins in your club"
  checked={preferences.push_game_started}
  onCheckedChange={(v) => handleToggle('push_game_started', v)}
/>
<SettingRow
  id="push_player_eliminated"
  label="Player Eliminations"
  description="When players bust out during a tournament"
  checked={preferences.push_player_eliminated}
  onCheckedChange={(v) => handleToggle('push_player_eliminated', v)}
/>
<SettingRow
  id="push_rebuy_addon"
  label="Rebuys & Add-ons"
  description="When the prize pool grows"
  checked={preferences.push_rebuy_addon}
  onCheckedChange={(v) => handleToggle('push_rebuy_addon', v)}
/>
```

---

### Part 8: Helper Function for Getting Club Members

**File: `src/lib/club-members.ts`** (new file)

```typescript
export async function getClubMemberIds(clubId: string): Promise<string[]> {
  const { data: members } = await supabase
    .from('club_members')
    .select('user_id')
    .eq('club_id', clubId);
  
  return members?.map(m => m.user_id) || [];
}

export async function logGameActivity(
  sessionId: string,
  type: string,
  playerId: string | null,
  metadata: Record<string, any>
) {
  const { error } = await supabase
    .from('game_activity_log')
    .insert({
      game_session_id: sessionId,
      activity_type: type,
      player_id: playerId,
      metadata,
    });
  
  if (error) console.error('Failed to log activity:', error);
}
```

---

### Summary of Changes

| File | Change |
|------|--------|
| **Database** | Add `game_activity_log` table + new preference columns |
| `supabase/functions/send-push-notification/index.ts` | Add new notification types |
| `src/lib/push-notifications.ts` | Add `notifyGameStarted`, `notifyPlayerEliminated`, `notifyRebuyAddon` |
| `src/lib/in-app-notifications.ts` | Add matching in-app notification functions |
| `src/lib/club-members.ts` | **New** - Helper for getting member IDs and logging activity |
| `src/components/game/ActivityFeed.tsx` | **New** - Real-time activity feed component |
| `src/pages/GameMode.tsx` | Trigger notifications on start, add activity tab |
| `src/components/game/PlayerList.tsx` | Trigger notifications on elimination |
| `src/components/game/BuyInTracker.tsx` | Trigger notifications on rebuy/addon |
| `src/components/game/TournamentClock.tsx` | Trigger notifications on blinds up |
| `src/components/settings/PushNotificationPreferences.tsx` | Add new preference toggles |
| `src/hooks/useUserPreferences.ts` | Add new preference fields |

---

### User Experience After Implementation

1. **When tournament starts**: All club members get push + in-app notification "Tournament Started - Friday Night Poker is now underway!"

2. **When player busts**: All members notified "Player Out - Alex finished 5th • 8 remaining"

3. **When rebuy/addon**: "Rebuy Added - Mike rebought • Pool: £350"

4. **When blinds increase**: "Blinds Up - 100/200 (ante 25)"

5. **Activity Feed**: On the game page, a scrollable log shows all events in real-time with timestamps

6. **Preferences**: Users can toggle off specific notification types they don't want

---

### Technical Notes

- All notifications respect user preferences (checked before sending)
- Activity log uses Supabase Realtime for instant updates across all devices
- Notifications are sent to ALL club members (not just players), as specified
- The notification edge function will be updated to check the new preference columns
- RLS ensures only club members can view the activity log

