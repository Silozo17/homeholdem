import { supabase } from "@/integrations/supabase/client";

interface SendPushParams {
  userIds: string[];
  title: string;
  body: string;
  icon?: string;
  url?: string;
  tag?: string;
  notificationType?: 'rsvp_updates' | 'date_finalized' | 'waitlist_promotion' | 'chat_messages' | 'blinds_up';
}

export async function sendPushNotification({
  userIds,
  title,
  body,
  icon,
  url,
  tag,
  notificationType,
}: SendPushParams) {
  const { data, error } = await supabase.functions.invoke("send-push-notification", {
    body: {
      user_ids: userIds,
      title,
      body,
      icon,
      url,
      tag,
      notification_type: notificationType,
    },
  });

  if (error) {
    console.error("Failed to send push notification:", error);
    throw error;
  }

  return data;
}

// Convenience functions for common notification types
export async function notifyEventRsvp(
  hostUserId: string,
  eventTitle: string,
  playerName: string,
  eventId: string
) {
  return sendPushNotification({
    userIds: [hostUserId],
    title: "New RSVP! 🃏",
    body: `${playerName} is joining ${eventTitle}`,
    url: `/event/${eventId}`,
    tag: `rsvp-${eventId}`,
    notificationType: 'rsvp_updates',
  });
}

export async function notifyWaitlistPromotion(
  userId: string,
  eventTitle: string,
  eventId: string
) {
  return sendPushNotification({
    userIds: [userId],
    title: "You're In! 🎉",
    body: `A spot opened up for ${eventTitle}`,
    url: `/event/${eventId}`,
    tag: `waitlist-${eventId}`,
    notificationType: 'waitlist_promotion',
  });
}

export async function notifyDateFinalized(
  userIds: string[],
  eventTitle: string,
  eventId: string,
  formattedDate: string
) {
  return sendPushNotification({
    userIds,
    title: "Date Confirmed! 📅",
    body: `${eventTitle} is set for ${formattedDate}`,
    url: `/event/${eventId}`,
    tag: `date-${eventId}`,
    notificationType: 'date_finalized',
  });
}

export async function notifyNewChatMessage(
  userIds: string[],
  senderName: string,
  clubId: string,
  eventId?: string
) {
  return sendPushNotification({
    userIds,
    title: `${senderName} 💬`,
    body: "New message in poker chat",
    url: eventId ? `/event/${eventId}` : `/club/${clubId}`,
    tag: `chat-${eventId || clubId}`,
    notificationType: 'chat_messages',
  });
}

export async function notifyBlindsUp(
  userIds: string[],
  smallBlind: number,
  bigBlind: number,
  ante: number
) {
  return sendPushNotification({
    userIds,
    title: "Blinds Up! ⏰",
    body: `${smallBlind}/${bigBlind}${ante ? ` (ante ${ante})` : ""}`,
    tag: "blinds-up",
    notificationType: 'blinds_up',
  });
}
