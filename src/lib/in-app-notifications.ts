import { supabase } from "@/integrations/supabase/client";

interface CreateNotificationParams {
  userId: string;
  type: 'rsvp' | 'date_finalized' | 'waitlist_promotion' | 'host_confirmed' | 'chat_message' | 'event_created' | 'club_invite';
  title: string;
  body: string;
  url?: string;
  eventId?: string;
  clubId?: string;
  senderId?: string;
}

/**
 * Creates an in-app notification for a user.
 * This stores the notification in the database for display in the notification center.
 */
export async function createInAppNotification({
  userId,
  type,
  title,
  body,
  url,
  eventId,
  clubId,
  senderId,
}: CreateNotificationParams) {
  const { error } = await supabase.from('notifications').insert({
    user_id: userId,
    type,
    title,
    body,
    url: url || null,
    event_id: eventId || null,
    club_id: clubId || null,
    sender_id: senderId || null,
  });

  if (error) {
    console.error('Failed to create in-app notification:', error);
  }

  return { error };
}

/**
 * Creates notifications for multiple users at once.
 */
export async function createBulkNotifications(
  userIds: string[],
  params: Omit<CreateNotificationParams, 'userId'>
) {
  if (userIds.length === 0) return { error: null };

  const notifications = userIds.map(userId => ({
    user_id: userId,
    type: params.type,
    title: params.title,
    body: params.body,
    url: params.url || null,
    event_id: params.eventId || null,
    club_id: params.clubId || null,
    sender_id: params.senderId || null,
  }));

  const { error } = await supabase.from('notifications').insert(notifications);

  if (error) {
    console.error('Failed to create bulk notifications:', error);
  }

  return { error };
}

// Convenience functions for common notification types

export async function notifyEventRsvpInApp(
  hostUserId: string,
  eventTitle: string,
  playerName: string,
  eventId: string,
  senderId: string
) {
  return createInAppNotification({
    userId: hostUserId,
    type: 'rsvp',
    title: 'New RSVP',
    body: `${playerName} is joining ${eventTitle}`,
    url: `/event/${eventId}`,
    eventId,
    senderId,
  });
}

export async function notifyWaitlistPromotionInApp(
  userId: string,
  eventTitle: string,
  eventId: string
) {
  return createInAppNotification({
    userId,
    type: 'waitlist_promotion',
    title: "You're In!",
    body: `A spot opened up for ${eventTitle}`,
    url: `/event/${eventId}`,
    eventId,
  });
}

export async function notifyDateFinalizedInApp(
  userIds: string[],
  eventTitle: string,
  eventId: string,
  formattedDate: string
) {
  return createBulkNotifications(userIds, {
    type: 'date_finalized',
    title: 'Date Confirmed',
    body: `${eventTitle} is set for ${formattedDate}`,
    url: `/event/${eventId}`,
    eventId,
  });
}

export async function notifyHostConfirmedInApp(
  userIds: string[],
  eventTitle: string,
  eventId: string,
  hostName: string,
  address?: string | null
) {
  return createBulkNotifications(userIds, {
    type: 'host_confirmed',
    title: 'Host Confirmed',
    body: address
      ? `${hostName} is hosting at ${address}`
      : `${hostName} is confirmed to host ${eventTitle}`,
    url: `/event/${eventId}`,
    eventId,
  });
}

export async function notifyNewChatMessageInApp(
  userIds: string[],
  senderName: string,
  clubId: string,
  senderId: string,
  eventId?: string
) {
  return createBulkNotifications(userIds, {
    type: 'chat_message',
    title: senderName,
    body: 'New message in poker chat',
    url: eventId ? `/event/${eventId}` : `/club/${clubId}`,
    eventId,
    clubId,
    senderId,
  });
}

export async function notifyEventCreatedInApp(
  userIds: string[],
  eventTitle: string,
  clubName: string,
  eventId: string,
  clubId: string
) {
  return createBulkNotifications(userIds, {
    type: 'event_created',
    title: 'New Event',
    body: `${eventTitle} in ${clubName}`,
    url: `/event/${eventId}`,
    eventId,
    clubId,
  });
}
