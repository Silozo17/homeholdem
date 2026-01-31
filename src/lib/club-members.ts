import { supabase } from '@/integrations/supabase/client';

/**
 * Get all member user IDs for a club
 */
export async function getClubMemberIds(clubId: string): Promise<string[]> {
  const { data: members } = await supabase
    .from('club_members')
    .select('user_id')
    .eq('club_id', clubId);

  return members?.map(m => m.user_id) || [];
}

/**
 * Get all member user IDs for an event's club
 */
export async function getEventClubMemberIds(eventId: string): Promise<{ memberIds: string[]; clubId: string | null }> {
  // First get the club_id from the event
  const { data: eventData } = await supabase
    .from('events')
    .select('club_id')
    .eq('id', eventId)
    .single();

  if (!eventData?.club_id) {
    return { memberIds: [], clubId: null };
  }

  const memberIds = await getClubMemberIds(eventData.club_id);
  return { memberIds, clubId: eventData.club_id };
}

export type GameActivityType = 
  | 'game_started'
  | 'player_eliminated'
  | 'rebuy'
  | 'addon'
  | 'blinds_up'
  | 'break_start'
  | 'break_end'
  | 'game_completed';

/**
 * Log an activity to the game activity log
 */
export async function logGameActivity(
  sessionId: string,
  activityType: GameActivityType,
  playerId: string | null,
  playerName: string | null,
  metadata: Record<string, any> = {}
): Promise<void> {
  const { error } = await supabase
    .from('game_activity_log')
    .insert({
      game_session_id: sessionId,
      activity_type: activityType,
      player_id: playerId,
      player_name: playerName,
      metadata,
    });

  if (error) {
    console.error('Failed to log game activity:', error);
  }
}

/**
 * Helper to get ordinal suffix for a number
 */
export function getOrdinalSuffix(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}
