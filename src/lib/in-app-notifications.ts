import { supabase } from "@/integrations/supabase/client";

let cachedSenderId: string | null | undefined;

async function getSenderId(explicit?: string): Promise<string | null> {
  if (explicit) return explicit;
  if (cachedSenderId !== undefined) return cachedSenderId;
  const { data, error } = await supabase.auth.getUser();
  if (error) {
    console.error('Failed to get current user for notifications:', error);
    cachedSenderId = null;
    return null;
  }
  cachedSenderId = data.user?.id ?? null;
  return cachedSenderId;
}

interface CreateNotificationParams {
  userId: string;
  type: 'rsvp' | 'date_finalized' | 'waitlist_promotion' | 'host_confirmed' | 'chat_message' | 'event_created' | 'club_invite' | 'game_completed' | 'event_unlocked' | 'member_rsvp' | 'member_vote' | 'club_broadcast';
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
  const resolvedSenderId = await getSenderId(senderId);
  if (!resolvedSenderId) {
    console.error('Cannot create notification without an authenticated sender');
    return { error: new Error('Not authenticated') };
  }

  const { error } = await supabase.from('notifications').insert({
    user_id: userId,
    type,
    title,
    body,
    url: url || null,
    event_id: eventId || null,
    club_id: clubId || null,
    sender_id: resolvedSenderId,
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

  const resolvedSenderId = await getSenderId(params.senderId);
  if (!resolvedSenderId) {
    console.error('Cannot create bulk notifications without an authenticated sender');
    return { error: new Error('Not authenticated') };
  }

  const notifications = userIds.map(userId => ({
    user_id: userId,
    type: params.type,
    title: params.title,
    body: params.body,
    url: params.url || null,
    event_id: params.eventId || null,
    club_id: params.clubId || null,
    sender_id: resolvedSenderId,
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

export async function notifyGameCompletedInApp(
  userIds: string[],
  winnerNames: string[],
  eventTitle: string,
  eventId: string,
  clubId: string
) {
  const body = winnerNames.length > 0
    ? `Winner: ${winnerNames[0]}${winnerNames.length > 1 ? ` | 2nd: ${winnerNames[1]}` : ''}${winnerNames.length > 2 ? ` | 3rd: ${winnerNames[2]}` : ''}`
    : 'Tournament finished!';
    
  return createBulkNotifications(userIds, {
    type: 'game_completed',
    title: 'Game Complete',
    body,
    url: `/club/${clubId}`,
    eventId,
    clubId,
  });
}

export async function notifyEventUnlockedInApp(
  userIds: string[],
  eventTitle: string,
  eventId: string,
  clubId: string
) {
  return createBulkNotifications(userIds, {
    type: 'event_unlocked',
    title: 'Event Unlocked',
    body: `Voting is now open for ${eventTitle}`,
    url: `/event/${eventId}`,
    eventId,
    clubId,
  });
}

export async function notifyNewEventAvailableInApp(
  userIds: string[],
  eventTitle: string,
  eventId: string,
  clubId: string
) {
  return createBulkNotifications(userIds, {
    type: 'event_unlocked',
    title: 'New Event Available',
    body: `Voting is now open for ${eventTitle}`,
    url: `/event/${eventId}`,
    eventId,
    clubId,
  });
}

// Game notifications

function getOrdinalSuffix(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}

export async function notifyGameStartedInApp(
  userIds: string[],
  eventTitle: string,
  eventId: string,
  clubId: string
) {
  return createBulkNotifications(userIds, {
    type: 'event_created',
    title: 'Tournament Started',
    body: `${eventTitle} is now underway!`,
    url: `/event/${eventId}/game`,
    eventId,
    clubId,
  });
}

export async function notifyPlayerEliminatedInApp(
  userIds: string[],
  playerName: string,
  position: number,
  playersRemaining: number,
  eventId: string,
  clubId: string
) {
  const suffix = getOrdinalSuffix(position);
  return createBulkNotifications(userIds, {
    type: 'game_completed',
    title: 'Player Out',
    body: `${playerName} finished ${position}${suffix} • ${playersRemaining} remaining`,
    url: `/event/${eventId}/game`,
    eventId,
    clubId,
  });
}

export async function notifyRebuyAddonInApp(
  userIds: string[],
  playerName: string,
  type: 'rebuy' | 'addon',
  prizePool: number,
  currencySymbol: string,
  eventId: string,
  clubId: string
) {
  return createBulkNotifications(userIds, {
    type: 'game_completed',
    title: type === 'rebuy' ? 'Rebuy Added' : 'Add-on Added',
    body: `${playerName} ${type === 'rebuy' ? 'rebought' : 'added on'} • Pool: ${currencySymbol}${prizePool}`,
    url: `/event/${eventId}/game`,
    eventId,
    clubId,
  });
}

export async function notifyBlindsUpInApp(
  userIds: string[],
  smallBlind: number,
  bigBlind: number,
  ante: number,
  eventId: string,
  clubId: string
) {
  return createBulkNotifications(userIds, {
    type: 'game_completed',
    title: 'Blinds Up',
    body: `${smallBlind}/${bigBlind}${ante ? ` (ante ${ante})` : ''}`,
    url: `/event/${eventId}/game`,
    eventId,
    clubId,
  });
}

// Friend request notifications
export async function notifyFriendRequestInApp(
  targetUserId: string,
  senderName: string,
  senderId: string
) {
  return createInAppNotification({
    userId: targetUserId,
    type: 'club_invite',
    title: 'Friend Request',
    body: `${senderName} wants to be your friend`,
    url: '/friends',
    senderId,
  });
}

export async function notifyFriendAcceptedInApp(
  requesterId: string,
  accepterName: string,
  senderId: string
) {
  return createInAppNotification({
    userId: requesterId,
    type: 'club_invite',
    title: 'Friend Added',
    body: `${accepterName} accepted your friend request`,
    url: '/friends',
    senderId,
  });
}

// Direct message notification
export async function notifyDirectMessageInApp(
  receiverId: string,
  senderName: string,
  senderId: string
) {
  return createInAppNotification({
    userId: receiverId,
    type: 'chat_message',
    title: senderName,
    body: 'Sent you a message',
    url: '/inbox',
    senderId,
  });
}

// New member joined club notification
export async function notifyNewMemberJoinedInApp(
  adminUserIds: string[],
  memberName: string,
  clubId: string
) {
  return createBulkNotifications(adminUserIds, {
    type: 'club_invite',
    title: 'New Member',
    body: `${memberName} joined your club`,
    url: `/club/${clubId}`,
    clubId,
  });
}

// Broadcast notification from club owner
export async function sendBroadcastInApp(
  userIds: string[],
  title: string,
  body: string,
  clubId: string
) {
  return createBulkNotifications(userIds, {
    type: 'club_broadcast',
    title,
    body,
    url: `/club/${clubId}`,
    clubId,
  });
}
