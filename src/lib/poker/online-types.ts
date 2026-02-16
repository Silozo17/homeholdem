// Types for multiplayer online poker (matches edge function API contracts)

import { Card } from './types';

export interface OnlineTableInfo {
  id: string;
  name: string;
  table_type: 'public' | 'friends' | 'club';
  max_seats: number;
  small_blind: number;
  big_blind: number;
  ante: number;
  min_buy_in: number;
  max_buy_in: number;
  status: 'waiting' | 'playing' | 'closed';
  invite_code: string | null;
  club_id: string | null;
  created_by: string;
  blind_timer_minutes: number;
}

export interface OnlineSeatInfo {
  seat: number;
  player_id: string | null;
  display_name: string;
  avatar_url: string | null;
  stack: number;
  status: string;
  has_cards: boolean;
  current_bet?: number;
  last_action?: string | null;
}

export interface OnlineHandInfo {
  hand_id: string;
  hand_number: number;
  phase: string;
  community_cards: Card[];
  pots: Array<{ amount: number; eligible_player_ids: string[] }>;
  current_actor_seat: number | null;
  current_bet: number;
  min_raise: number;
  action_deadline: string | null;
  dealer_seat: number;
  sb_seat: number;
  bb_seat: number;
  state_version: number;
  blinds: { small: number; big: number; ante: number };
  // From broadcast, not from table-state
  current_actor_id?: string | null;
  seats?: OnlineSeatInfo[];
}

export interface OnlineTableState {
  table: OnlineTableInfo;
  seats: OnlineSeatInfo[];
  current_hand: OnlineHandInfo | null;
  my_cards: Card[] | null;
}

export interface CreateTableParams {
  name: string;
  table_type?: 'public' | 'friends' | 'club';
  max_seats?: number;
  small_blind?: number;
  big_blind?: number;
  ante?: number;
  min_buy_in?: number;
  max_buy_in?: number;
  club_id?: string;
}
