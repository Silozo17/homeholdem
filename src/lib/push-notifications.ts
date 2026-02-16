import { supabase } from "@/integrations/supabase/client";

import { getOrdinalSuffix } from './club-members';

interface SendPushParams {
  userIds: string[];
  title: string;
  body: string;
  icon?: string;
  url?: string;
  tag?: string;
  notificationType?: 'rsvp_updates' | 'date_finalized' | 'waitlist_promotion' | 'chat_messages' | 'blinds_up' | 'game_completed' | 'event_unlocked' | 'member_rsvp' | 'member_vote' | 'game_started' | 'player_eliminated' | 'rebuy_addon';
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
// NOTE: All titles are clean text (no emojis) for a premium feel

export async function notifyEventRsvp(
  hostUserId: string,
  eventTitle: string,
  playerName: string,
  eventId: string
) {
  return sendPushNotification({
    userIds: [hostUserId],
    title: "New RSVP",
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
    title: "You're In!",
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
    title: "Date Confirmed",
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
    title: senderName,
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
    title: "Blinds Up",
    body: `${smallBlind}/${bigBlind}${ante ? ` (ante ${ante})` : ""}`,
    tag: "blinds-up",
    notificationType: 'blinds_up',
  });
}

export async function notifyHostConfirmed(
  userIds: string[],
  eventTitle: string,
  eventId: string,
  hostName: string,
  address?: string | null
) {
  return sendPushNotification({
    userIds,
    title: "Host Confirmed",
    body: address
      ? `${hostName} is hosting at ${address}`
      : `${hostName} is confirmed to host ${eventTitle}`,
    url: `/event/${eventId}`,
    tag: `host-${eventId}`,
    notificationType: 'rsvp_updates',
  });
}

export async function notifyGameCompleted(
  userIds: string[],
  winnerNames: string[],
  eventTitle: string,
  clubId: string,
  sessionId: string
) {
  const body = winnerNames.length > 0
    ? `Winner: ${winnerNames[0]}${winnerNames.length > 1 ? ` | 2nd: ${winnerNames[1]}` : ''}${winnerNames.length > 2 ? ` | 3rd: ${winnerNames[2]}` : ''}`
    : 'Tournament finished!';
    
  return sendPushNotification({
    userIds,
    title: 'Game Complete',
    body,
    url: `/club/${clubId}`,
    tag: `game-complete-${sessionId}`,
    notificationType: 'game_completed',
  });
}

export async function notifyEventUnlocked(
  userIds: string[],
  eventTitle: string,
  eventId: string
) {
  return sendPushNotification({
    userIds,
    title: 'Event Unlocked',
    body: `Voting is now open for ${eventTitle}`,
    url: `/event/${eventId}`,
    tag: `event-unlocked-${eventId}`,
    notificationType: 'event_unlocked',
  });
}

export async function notifyNewEventAvailable(
  userIds: string[],
  eventTitle: string,
  eventId: string
) {
  return sendPushNotification({
    userIds,
    title: 'New Event Available',
    body: `Voting is now open for ${eventTitle}`,
    url: `/event/${eventId}`,
    tag: `event-available-${eventId}`,
    notificationType: 'event_unlocked',
  });
}

// Game notifications

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

// Poker game invite
export async function notifyPokerInvite(
  userId: string,
  inviterName: string,
  tableName: string,
  tableId: string
) {
  return sendPushNotification({
    userIds: [userId],
    title: 'Poker Invite',
    body: `${inviterName} invited you to play at ${tableName}`,
    url: `/online-poker?table=${tableId}`,
    tag: `poker-invite-${tableId}`,
    notificationType: 'rsvp_updates',
  });
}

// Broadcast notification from club owner
export async function sendBroadcastPush(
  userIds: string[],
  title: string,
  body: string,
  clubId: string
) {
  return sendPushNotification({
    userIds,
    title,
    body,
    url: `/club/${clubId}`,
    tag: `broadcast-${clubId}-${Date.now()}`,
    notificationType: 'rsvp_updates',
  });
}
