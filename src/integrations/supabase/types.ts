export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          created_at: string
          id: string
          new_values: Json | null
          old_values: Json | null
          record_id: string
          table_name: string
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          new_values?: Json | null
          old_values?: Json | null
          record_id: string
          table_name: string
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          new_values?: Json | null
          old_values?: Json | null
          record_id?: string
          table_name?: string
          user_id?: string
        }
        Relationships: []
      }
      blind_structures: {
        Row: {
          ante: number
          big_blind: number
          created_at: string
          duration_minutes: number
          game_session_id: string
          id: string
          is_break: boolean
          level: number
          small_blind: number
        }
        Insert: {
          ante?: number
          big_blind: number
          created_at?: string
          duration_minutes?: number
          game_session_id: string
          id?: string
          is_break?: boolean
          level: number
          small_blind: number
        }
        Update: {
          ante?: number
          big_blind?: number
          created_at?: string
          duration_minutes?: number
          game_session_id?: string
          id?: string
          is_break?: boolean
          level?: number
          small_blind?: number
        }
        Relationships: [
          {
            foreignKeyName: "blind_structures_game_session_id_fkey"
            columns: ["game_session_id"]
            isOneToOne: false
            referencedRelation: "game_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          club_id: string
          created_at: string
          event_id: string | null
          id: string
          message: string
          user_id: string
        }
        Insert: {
          club_id: string
          created_at?: string
          event_id?: string | null
          id?: string
          message: string
          user_id: string
        }
        Update: {
          club_id?: string
          created_at?: string
          event_id?: string | null
          id?: string
          message?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      chip_denominations: {
        Row: {
          cash_value: number
          color: string
          created_at: string
          denomination: number
          display_order: number
          id: string
          template_id: string
        }
        Insert: {
          cash_value: number
          color: string
          created_at?: string
          denomination: number
          display_order?: number
          id?: string
          template_id: string
        }
        Update: {
          cash_value?: number
          color?: string
          created_at?: string
          denomination?: number
          display_order?: number
          id?: string
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chip_denominations_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "chip_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      chip_templates: {
        Row: {
          club_id: string
          created_at: string
          currency: string
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          club_id: string
          created_at?: string
          currency?: string
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Update: {
          club_id?: string
          created_at?: string
          currency?: string
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chip_templates_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      club_members: {
        Row: {
          club_id: string
          id: string
          joined_at: string
          role: Database["public"]["Enums"]["club_role"]
          user_id: string
        }
        Insert: {
          club_id: string
          id?: string
          joined_at?: string
          role?: Database["public"]["Enums"]["club_role"]
          user_id: string
        }
        Update: {
          club_id?: string
          id?: string
          joined_at?: string
          role?: Database["public"]["Enums"]["club_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "club_members_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      club_rules: {
        Row: {
          club_id: string
          content: string
          created_at: string
          display_order: number
          id: string
          title: string
          updated_at: string
        }
        Insert: {
          club_id: string
          content: string
          created_at?: string
          display_order?: number
          id?: string
          title: string
          updated_at?: string
        }
        Update: {
          club_id?: string
          content?: string
          created_at?: string
          display_order?: number
          id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "club_rules_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      clubs: {
        Row: {
          created_at: string
          description: string | null
          id: string
          invite_code: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          invite_code: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          invite_code?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      email_verifications: {
        Row: {
          code: string
          created_at: string | null
          email: string
          expires_at: string
          id: string
          verified_at: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          email: string
          expires_at?: string
          id?: string
          verified_at?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          email?: string
          expires_at?: string
          id?: string
          verified_at?: string | null
        }
        Relationships: []
      }
      event_date_options: {
        Row: {
          created_at: string
          event_id: string
          id: string
          proposed_date: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          proposed_date: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          proposed_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_date_options_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_date_votes: {
        Row: {
          created_at: string
          date_option_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          date_option_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          date_option_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_date_votes_date_option_id_fkey"
            columns: ["date_option_id"]
            isOneToOne: false
            referencedRelation: "event_date_options"
            referencedColumns: ["id"]
          },
        ]
      }
      event_host_volunteers: {
        Row: {
          created_at: string
          event_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_host_volunteers_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_host_votes: {
        Row: {
          created_at: string
          event_id: string
          id: string
          volunteer_user_id: string
          voter_user_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          volunteer_user_id: string
          voter_user_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          volunteer_user_id?: string
          voter_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_host_votes_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_rsvps: {
        Row: {
          created_at: string
          event_id: string
          id: string
          is_waitlisted: boolean
          status: Database["public"]["Enums"]["rsvp_status"]
          updated_at: string
          user_id: string
          waitlist_position: number | null
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          is_waitlisted?: boolean
          status?: Database["public"]["Enums"]["rsvp_status"]
          updated_at?: string
          user_id: string
          waitlist_position?: number | null
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          is_waitlisted?: boolean
          status?: Database["public"]["Enums"]["rsvp_status"]
          updated_at?: string
          user_id?: string
          waitlist_position?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "event_rsvps_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          club_id: string
          created_at: string
          created_by: string
          description: string | null
          final_date: string | null
          host_user_id: string | null
          id: string
          is_finalized: boolean
          location: string | null
          max_tables: number
          seats_per_table: number
          title: string
          updated_at: string
        }
        Insert: {
          club_id: string
          created_at?: string
          created_by: string
          description?: string | null
          final_date?: string | null
          host_user_id?: string | null
          id?: string
          is_finalized?: boolean
          location?: string | null
          max_tables?: number
          seats_per_table?: number
          title: string
          updated_at?: string
        }
        Update: {
          club_id?: string
          created_at?: string
          created_by?: string
          description?: string | null
          final_date?: string | null
          host_user_id?: string | null
          id?: string
          is_finalized?: boolean
          location?: string | null
          max_tables?: number
          seats_per_table?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      game_players: {
        Row: {
          created_at: string
          display_name: string
          eliminated_at: string | null
          email: string | null
          finish_position: number | null
          game_session_id: string
          id: string
          is_guest: boolean | null
          placeholder_player_id: string | null
          seat_number: number | null
          status: string
          table_number: number | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          display_name: string
          eliminated_at?: string | null
          email?: string | null
          finish_position?: number | null
          game_session_id: string
          id?: string
          is_guest?: boolean | null
          placeholder_player_id?: string | null
          seat_number?: number | null
          status?: string
          table_number?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          display_name?: string
          eliminated_at?: string | null
          email?: string | null
          finish_position?: number | null
          game_session_id?: string
          id?: string
          is_guest?: boolean | null
          placeholder_player_id?: string | null
          seat_number?: number | null
          status?: string
          table_number?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "game_players_game_session_id_fkey"
            columns: ["game_session_id"]
            isOneToOne: false
            referencedRelation: "game_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_players_placeholder_player_id_fkey"
            columns: ["placeholder_player_id"]
            isOneToOne: false
            referencedRelation: "placeholder_players"
            referencedColumns: ["id"]
          },
        ]
      }
      game_sessions: {
        Row: {
          addon_amount: number
          addon_chips: number
          allow_addons: boolean
          allow_rebuys: boolean
          buy_in_amount: number
          created_at: string
          current_level: number
          display_blinds_as_currency: boolean | null
          event_id: string
          id: string
          level_started_at: string | null
          rebuy_amount: number
          rebuy_chips: number
          rebuy_until_level: number | null
          starting_chips: number
          status: string
          time_remaining_seconds: number | null
          updated_at: string
        }
        Insert: {
          addon_amount?: number
          addon_chips?: number
          allow_addons?: boolean
          allow_rebuys?: boolean
          buy_in_amount?: number
          created_at?: string
          current_level?: number
          display_blinds_as_currency?: boolean | null
          event_id: string
          id?: string
          level_started_at?: string | null
          rebuy_amount?: number
          rebuy_chips?: number
          rebuy_until_level?: number | null
          starting_chips?: number
          status?: string
          time_remaining_seconds?: number | null
          updated_at?: string
        }
        Update: {
          addon_amount?: number
          addon_chips?: number
          allow_addons?: boolean
          allow_rebuys?: boolean
          buy_in_amount?: number
          created_at?: string
          current_level?: number
          display_blinds_as_currency?: boolean | null
          event_id?: string
          id?: string
          level_started_at?: string | null
          rebuy_amount?: number
          rebuy_chips?: number
          rebuy_until_level?: number | null
          starting_chips?: number
          status?: string
          time_remaining_seconds?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "game_sessions_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      game_transactions: {
        Row: {
          amount: number
          chips: number | null
          created_at: string
          created_by: string
          game_player_id: string
          game_session_id: string
          id: string
          notes: string | null
          transaction_type: string
        }
        Insert: {
          amount: number
          chips?: number | null
          created_at?: string
          created_by: string
          game_player_id: string
          game_session_id: string
          id?: string
          notes?: string | null
          transaction_type: string
        }
        Update: {
          amount?: number
          chips?: number | null
          created_at?: string
          created_by?: string
          game_player_id?: string
          game_session_id?: string
          id?: string
          notes?: string | null
          transaction_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "game_transactions_game_player_id_fkey"
            columns: ["game_player_id"]
            isOneToOne: false
            referencedRelation: "game_players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_transactions_game_session_id_fkey"
            columns: ["game_session_id"]
            isOneToOne: false
            referencedRelation: "game_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      payout_structures: {
        Row: {
          amount: number | null
          created_at: string
          game_session_id: string
          id: string
          percentage: number
          player_id: string | null
          position: number
        }
        Insert: {
          amount?: number | null
          created_at?: string
          game_session_id: string
          id?: string
          percentage: number
          player_id?: string | null
          position: number
        }
        Update: {
          amount?: number | null
          created_at?: string
          game_session_id?: string
          id?: string
          percentage?: number
          player_id?: string | null
          position?: number
        }
        Relationships: [
          {
            foreignKeyName: "payout_structures_game_session_id_fkey"
            columns: ["game_session_id"]
            isOneToOne: false
            referencedRelation: "game_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payout_structures_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "game_players"
            referencedColumns: ["id"]
          },
        ]
      }
      placeholder_players: {
        Row: {
          club_id: string
          created_at: string
          display_name: string
          id: string
          linked_user_id: string | null
        }
        Insert: {
          club_id: string
          created_at?: string
          display_name: string
          id?: string
          linked_user_id?: string | null
        }
        Update: {
          club_id?: string
          created_at?: string
          display_name?: string
          id?: string
          linked_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "placeholder_players_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string
          email: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name: string
          email?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string
          email?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth_key: string
          created_at: string
          endpoint: string
          id: string
          p256dh_key: string
          updated_at: string
          user_id: string
        }
        Insert: {
          auth_key: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh_key: string
          updated_at?: string
          user_id: string
        }
        Update: {
          auth_key?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh_key?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      season_standings: {
        Row: {
          created_at: string
          games_played: number
          id: string
          placeholder_player_id: string | null
          season_id: string
          second_places: number
          third_places: number
          total_points: number
          total_winnings: number
          updated_at: string
          user_id: string | null
          wins: number
        }
        Insert: {
          created_at?: string
          games_played?: number
          id?: string
          placeholder_player_id?: string | null
          season_id: string
          second_places?: number
          third_places?: number
          total_points?: number
          total_winnings?: number
          updated_at?: string
          user_id?: string | null
          wins?: number
        }
        Update: {
          created_at?: string
          games_played?: number
          id?: string
          placeholder_player_id?: string | null
          season_id?: string
          second_places?: number
          third_places?: number
          total_points?: number
          total_winnings?: number
          updated_at?: string
          user_id?: string | null
          wins?: number
        }
        Relationships: [
          {
            foreignKeyName: "season_standings_placeholder_player_id_fkey"
            columns: ["placeholder_player_id"]
            isOneToOne: false
            referencedRelation: "placeholder_players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "season_standings_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      seasons: {
        Row: {
          club_id: string
          created_at: string
          end_date: string
          id: string
          is_active: boolean
          name: string
          points_for_fourth: number
          points_for_second: number
          points_for_third: number
          points_for_win: number
          points_per_participation: number
          start_date: string
          updated_at: string
        }
        Insert: {
          club_id: string
          created_at?: string
          end_date: string
          id?: string
          is_active?: boolean
          name: string
          points_for_fourth?: number
          points_for_second?: number
          points_for_third?: number
          points_for_win?: number
          points_per_participation?: number
          start_date: string
          updated_at?: string
        }
        Update: {
          club_id?: string
          created_at?: string
          end_date?: string
          id?: string
          is_active?: boolean
          name?: string
          points_for_fourth?: number
          points_for_second?: number
          points_for_third?: number
          points_for_win?: number
          points_per_participation?: number
          start_date?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "seasons_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      settlements: {
        Row: {
          amount: number
          club_id: string
          created_at: string
          from_user_id: string
          game_session_id: string | null
          id: string
          is_settled: boolean
          notes: string | null
          settled_at: string | null
          settled_by: string | null
          to_user_id: string
          updated_at: string
        }
        Insert: {
          amount: number
          club_id: string
          created_at?: string
          from_user_id: string
          game_session_id?: string | null
          id?: string
          is_settled?: boolean
          notes?: string | null
          settled_at?: string | null
          settled_by?: string | null
          to_user_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          club_id?: string
          created_at?: string
          from_user_id?: string
          game_session_id?: string | null
          id?: string
          is_settled?: boolean
          notes?: string | null
          settled_at?: string | null
          settled_by?: string | null
          to_user_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "settlements_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "settlements_game_session_id_fkey"
            columns: ["game_session_id"]
            isOneToOne: false
            referencedRelation: "game_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      user_preferences: {
        Row: {
          created_at: string
          email_club_invites: boolean | null
          email_event_created: boolean | null
          email_event_reminder: boolean | null
          email_game_results: boolean | null
          email_rsvp_confirmation: boolean | null
          email_waitlist_promotion: boolean | null
          id: string
          language: string | null
          push_blinds_up: boolean | null
          push_chat_messages: boolean | null
          push_date_finalized: boolean | null
          push_rsvp_updates: boolean | null
          push_waitlist_promotion: boolean | null
          show_stats_publicly: boolean | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email_club_invites?: boolean | null
          email_event_created?: boolean | null
          email_event_reminder?: boolean | null
          email_game_results?: boolean | null
          email_rsvp_confirmation?: boolean | null
          email_waitlist_promotion?: boolean | null
          id?: string
          language?: string | null
          push_blinds_up?: boolean | null
          push_chat_messages?: boolean | null
          push_date_finalized?: boolean | null
          push_rsvp_updates?: boolean | null
          push_waitlist_promotion?: boolean | null
          show_stats_publicly?: boolean | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email_club_invites?: boolean | null
          email_event_created?: boolean | null
          email_event_reminder?: boolean | null
          email_game_results?: boolean | null
          email_rsvp_confirmation?: boolean | null
          email_waitlist_promotion?: boolean | null
          id?: string
          language?: string | null
          push_blinds_up?: boolean | null
          push_chat_messages?: boolean | null
          push_date_finalized?: boolean | null
          push_rsvp_updates?: boolean | null
          push_waitlist_promotion?: boolean | null
          show_stats_publicly?: boolean | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cleanup_expired_verifications: { Args: never; Returns: undefined }
      generate_invite_code: { Args: never; Returns: string }
      get_club_member_profiles: {
        Args: { _club_id: string }
        Returns: {
          avatar_url: string
          display_name: string
          email: string
          id: string
        }[]
      }
      has_club_role: {
        Args: {
          _club_id: string
          _role: Database["public"]["Enums"]["club_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_club_admin_or_owner: {
        Args: { _club_id: string; _user_id: string }
        Returns: boolean
      }
      is_club_member: {
        Args: { _club_id: string; _user_id: string }
        Returns: boolean
      }
      is_event_club_admin: {
        Args: { _event_id: string; _user_id: string }
        Returns: boolean
      }
      is_event_club_member: {
        Args: { _event_id: string; _user_id: string }
        Returns: boolean
      }
      is_game_session_club_admin: {
        Args: { _game_session_id: string; _user_id: string }
        Returns: boolean
      }
      is_game_session_club_member: {
        Args: { _game_session_id: string; _user_id: string }
        Returns: boolean
      }
      lookup_club_by_invite_code: {
        Args: { _invite_code: string }
        Returns: {
          id: string
          name: string
        }[]
      }
    }
    Enums: {
      club_role: "owner" | "admin" | "member"
      rsvp_status: "going" | "maybe" | "not_going"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      club_role: ["owner", "admin", "member"],
      rsvp_status: ["going", "maybe", "not_going"],
    },
  },
} as const
