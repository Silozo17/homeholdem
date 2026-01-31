import { supabase } from "@/integrations/supabase/client";

const DELAY_MINUTES = 3;

interface QueueNotificationParams {
  clubId: string;
  eventId: string;
  type: 'rsvp' | 'vote' | 'dropout';
  action: string;
  actorId: string;
  actorName: string;
}

/**
 * Queue a notification to be sent after 3 minutes.
 * If the user changes their action within 3 minutes, the old notification is superseded.
 * This prevents notification spam when users accidentally click the wrong option.
 */
export async function queueDelayedNotification({
  clubId,
  eventId,
  type,
  action,
  actorId,
  actorName,
}: QueueNotificationParams) {
  const scheduledFor = new Date(Date.now() + DELAY_MINUTES * 60 * 1000).toISOString();
  
  try {
    // Find any existing pending notification from this actor for this event/type
    const { data: existing } = await supabase
      .from('pending_notifications')
      .select('id')
      .eq('actor_id', actorId)
      .eq('event_id', eventId)
      .eq('type', type)
      .eq('is_processed', false)
      .is('superseded_by', null)
      .maybeSingle();
    
    // Insert new notification
    const { data: newNotification, error } = await supabase
      .from('pending_notifications')
      .insert({
        club_id: clubId,
        event_id: eventId,
        type,
        action,
        actor_id: actorId,
        actor_name: actorName,
        scheduled_for: scheduledFor,
      })
      .select('id')
      .single();
    
    if (error) {
      console.error('Failed to queue notification:', error);
      return;
    }
    
    // If there was an existing pending notification, supersede it
    if (existing && newNotification) {
      await supabase
        .from('pending_notifications')
        .update({ superseded_by: newNotification.id })
        .eq('id', existing.id);
    }
  } catch (err) {
    console.error('Error queueing delayed notification:', err);
  }
}
