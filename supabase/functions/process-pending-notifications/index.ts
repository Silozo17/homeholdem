import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PendingNotification {
  id: string;
  club_id: string;
  event_id: string | null;
  type: string;
  action: string;
  actor_id: string;
  actor_name: string;
  scheduled_for: string;
}

interface GroupedNotifications {
  [key: string]: PendingNotification[];
}

function buildTitle(type: string, count: number): string {
  switch (type) {
    case 'rsvp':
      return count === 1 ? 'RSVP Update' : `${count} RSVP Updates`;
    case 'vote':
      return count === 1 ? 'Date Vote' : `${count} Date Votes`;
    case 'dropout':
      return 'Player Dropped';
    default:
      return 'Club Update';
  }
}

function buildBody(notifications: PendingNotification[], eventTitle: string): string {
  const type = notifications[0].type;
  const actors = notifications.map(n => n.actor_name);
  
  if (actors.length === 1) {
    switch (type) {
      case 'rsvp':
        return `${actors[0]} updated their RSVP for ${eventTitle}`;
      case 'vote':
        return `${actors[0]} voted on dates for ${eventTitle}`;
      case 'dropout':
        return `${actors[0]} dropped from ${eventTitle}`;
      default:
        return `${actors[0]} made an update`;
    }
  } else if (actors.length === 2) {
    switch (type) {
      case 'rsvp':
        return `${actors[0]} and ${actors[1]} updated RSVPs for ${eventTitle}`;
      case 'vote':
        return `${actors[0]} and ${actors[1]} voted for ${eventTitle}`;
      default:
        return `${actors[0]} and ${actors[1]} made updates`;
    }
  } else {
    const othersCount = actors.length - 1;
    switch (type) {
      case 'rsvp':
        return `${actors[0]} and ${othersCount} others updated RSVPs for ${eventTitle}`;
      case 'vote':
        return `${actors[0]} and ${othersCount} others voted for ${eventTitle}`;
      default:
        return `${actors[0]} and ${othersCount} others made updates`;
    }
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 1. Query pending notifications ready to send
    const now = new Date().toISOString();
    const { data: pending, error: fetchError } = await supabase
      .from('pending_notifications')
      .select('*')
      .lte('scheduled_for', now)
      .eq('is_processed', false)
      .is('superseded_by', null)
      .limit(100);

    if (fetchError) {
      throw fetchError;
    }

    if (!pending || pending.length === 0) {
      return new Response(
        JSON.stringify({ message: "No pending notifications to process" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Processing ${pending.length} pending notifications`);

    // 2. Group by event + type
    const grouped: GroupedNotifications = {};
    for (const notification of pending) {
      const key = `${notification.event_id || 'club'}-${notification.type}`;
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(notification);
    }

    let totalSent = 0;

    // 3. For each group, create summary notification
    for (const [key, notifications] of Object.entries(grouped)) {
      const firstNotification = notifications[0];
      const actorIds = new Set(notifications.map(n => n.actor_id));
      
      // Get event title if event_id exists
      let eventTitle = 'the event';
      if (firstNotification.event_id) {
        const { data: event } = await supabase
          .from('events')
          .select('title')
          .eq('id', firstNotification.event_id)
          .single();
        
        if (event) {
          eventTitle = event.title;
        }
      }

      // Get all club members except actors
      const { data: members } = await supabase
        .from('club_members')
        .select('user_id')
        .eq('club_id', firstNotification.club_id);

      const recipientIds = (members || [])
        .map(m => m.user_id)
        .filter(id => !actorIds.has(id));

      if (recipientIds.length > 0) {
        const title = buildTitle(firstNotification.type, notifications.length);
        const body = buildBody(notifications, eventTitle);
        const notificationType = firstNotification.type === 'rsvp' ? 'member_rsvp' : 
                                 firstNotification.type === 'vote' ? 'member_vote' : 
                                 'rsvp_updates';

        // Send push notifications via our own function
        const pushResponse = await fetch(`${SUPABASE_URL}/functions/v1/send-push-notification`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          },
          body: JSON.stringify({
            user_ids: recipientIds,
            title,
            body,
            url: firstNotification.event_id ? `/event/${firstNotification.event_id}` : `/club/${firstNotification.club_id}`,
            tag: `${firstNotification.type}-${firstNotification.event_id || firstNotification.club_id}`,
            notification_type: notificationType,
          }),
        });

        if (!pushResponse.ok) {
          console.error('Push notification failed:', await pushResponse.text());
        } else {
          totalSent += recipientIds.length;
        }

        // Create in-app notifications - use the first actor as sender_id for RLS compliance
        const senderId = notifications[0].actor_id;
        const inAppNotifications = recipientIds.map(userId => ({
          user_id: userId,
          type: firstNotification.type === 'rsvp' ? 'rsvp' : 'date_finalized',
          title,
          body,
          url: firstNotification.event_id ? `/event/${firstNotification.event_id}` : `/club/${firstNotification.club_id}`,
          event_id: firstNotification.event_id,
          club_id: firstNotification.club_id,
          sender_id: senderId,
        }));

        const { error: insertError } = await supabase
          .from('notifications')
          .insert(inAppNotifications);

        if (insertError) {
          console.error('Failed to create in-app notifications:', insertError);
        }
      }

      // 4. Mark as processed
      const notificationIds = notifications.map(n => n.id);
      const { error: updateError } = await supabase
        .from('pending_notifications')
        .update({ is_processed: true })
        .in('id', notificationIds);

      if (updateError) {
        console.error('Failed to mark notifications as processed:', updateError);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed: pending.length,
        groups: Object.keys(grouped).length,
        notifications_sent: totalSent,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error processing pending notifications:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
