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
      app_admins: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
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
      banned_users: {
        Row: {
          banned_at: string
          banned_by: string | null
          created_at: string
          expires_at: string | null
          id: string
          reason: string | null
          type: string
          user_id: string
        }
        Insert: {
          banned_at?: string
          banned_by?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          reason?: string | null
          type?: string
          user_id: string
        }
        Update: {
          banned_at?: string
          banned_by?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          reason?: string | null
          type?: string
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
          currency: string
          default_addon_amount: number | null
          default_addon_chips: number | null
          default_allow_addons: boolean | null
          default_allow_rebuys: boolean | null
          default_buy_in_amount: number | null
          default_event_time: string | null
          default_level_duration: number | null
          default_max_tables: number | null
          default_rebuy_amount: number | null
          default_rebuy_chips: number | null
          default_rebuy_until_level: number | null
          default_seats_per_table: number | null
          default_starting_chips: number | null
          description: string | null
          display_mode: string | null
          id: string
          invite_code: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          currency?: string
          default_addon_amount?: number | null
          default_addon_chips?: number | null
          default_allow_addons?: boolean | null
          default_allow_rebuys?: boolean | null
          default_buy_in_amount?: number | null
          default_event_time?: string | null
          default_level_duration?: number | null
          default_max_tables?: number | null
          default_rebuy_amount?: number | null
          default_rebuy_chips?: number | null
          default_rebuy_until_level?: number | null
          default_seats_per_table?: number | null
          default_starting_chips?: number | null
          description?: string | null
          display_mode?: string | null
          id?: string
          invite_code: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          currency?: string
          default_addon_amount?: number | null
          default_addon_chips?: number | null
          default_allow_addons?: boolean | null
          default_allow_rebuys?: boolean | null
          default_buy_in_amount?: number | null
          default_event_time?: string | null
          default_level_duration?: number | null
          default_max_tables?: number | null
          default_rebuy_amount?: number | null
          default_rebuy_chips?: number | null
          default_rebuy_until_level?: number | null
          default_seats_per_table?: number | null
          default_starting_chips?: number | null
          description?: string | null
          display_mode?: string | null
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
          address: string | null
          created_at: string
          event_id: string
          id: string
          user_id: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          event_id: string
          id?: string
          user_id: string
        }
        Update: {
          address?: string | null
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
          is_unlocked: boolean
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
          is_unlocked?: boolean
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
          is_unlocked?: boolean
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
      game_activity_log: {
        Row: {
          activity_type: string
          created_at: string | null
          game_session_id: string
          id: string
          metadata: Json | null
          player_id: string | null
          player_name: string | null
        }
        Insert: {
          activity_type: string
          created_at?: string | null
          game_session_id: string
          id?: string
          metadata?: Json | null
          player_id?: string | null
          player_name?: string | null
        }
        Update: {
          activity_type?: string
          created_at?: string | null
          game_session_id?: string
          id?: string
          metadata?: Json | null
          player_id?: string | null
          player_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "game_activity_log_game_session_id_fkey"
            columns: ["game_session_id"]
            isOneToOne: false
            referencedRelation: "game_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_activity_log_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "game_players"
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
          prize_pool_override: number | null
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
          prize_pool_override?: number | null
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
          prize_pool_override?: number | null
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
      notifications: {
        Row: {
          body: string
          club_id: string | null
          created_at: string | null
          event_id: string | null
          id: string
          read_at: string | null
          sender_id: string | null
          title: string
          type: string
          url: string | null
          user_id: string
        }
        Insert: {
          body: string
          club_id?: string | null
          created_at?: string | null
          event_id?: string | null
          id?: string
          read_at?: string | null
          sender_id?: string | null
          title: string
          type: string
          url?: string | null
          user_id: string
        }
        Update: {
          body?: string
          club_id?: string | null
          created_at?: string | null
          event_id?: string | null
          id?: string
          read_at?: string | null
          sender_id?: string | null
          title?: string
          type?: string
          url?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
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
      pending_notifications: {
        Row: {
          action: string
          actor_id: string
          actor_name: string
          club_id: string
          created_at: string
          event_id: string | null
          id: string
          is_processed: boolean
          scheduled_for: string
          superseded_by: string | null
          type: string
        }
        Insert: {
          action: string
          actor_id: string
          actor_name: string
          club_id: string
          created_at?: string
          event_id?: string | null
          id?: string
          is_processed?: boolean
          scheduled_for: string
          superseded_by?: string | null
          type: string
        }
        Update: {
          action?: string
          actor_id?: string
          actor_name?: string
          club_id?: string
          created_at?: string
          event_id?: string | null
          id?: string
          is_processed?: boolean
          scheduled_for?: string
          superseded_by?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "pending_notifications_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pending_notifications_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pending_notifications_superseded_by_fkey"
            columns: ["superseded_by"]
            isOneToOne: false
            referencedRelation: "pending_notifications"
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
      poker_actions: {
        Row: {
          action_type: Database["public"]["Enums"]["poker_action_type"]
          amount: number | null
          hand_id: string
          id: string
          phase: Database["public"]["Enums"]["poker_hand_phase"]
          player_id: string
          seat_number: number
          sequence: number
          server_timestamp: string
        }
        Insert: {
          action_type: Database["public"]["Enums"]["poker_action_type"]
          amount?: number | null
          hand_id: string
          id?: string
          phase: Database["public"]["Enums"]["poker_hand_phase"]
          player_id: string
          seat_number: number
          sequence: number
          server_timestamp?: string
        }
        Update: {
          action_type?: Database["public"]["Enums"]["poker_action_type"]
          amount?: number | null
          hand_id?: string
          id?: string
          phase?: Database["public"]["Enums"]["poker_hand_phase"]
          player_id?: string
          seat_number?: number
          sequence?: number
          server_timestamp?: string
        }
        Relationships: [
          {
            foreignKeyName: "poker_actions_hand_id_fkey"
            columns: ["hand_id"]
            isOneToOne: false
            referencedRelation: "poker_hands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "poker_actions_hand_id_fkey"
            columns: ["hand_id"]
            isOneToOne: false
            referencedRelation: "poker_hands_public"
            referencedColumns: ["id"]
          },
        ]
      }
      poker_hands: {
        Row: {
          action_deadline: string | null
          bb_seat: number
          community_cards: Json
          completed_at: string | null
          current_actor_seat: number | null
          current_bet: number
          dealer_seat: number
          deck_seed_commitment: string | null
          deck_seed_internal: string | null
          deck_seed_revealed: string | null
          hand_number: number
          id: string
          min_raise: number
          phase: Database["public"]["Enums"]["poker_hand_phase"]
          pots: Json
          results: Json | null
          sb_seat: number
          started_at: string
          state_version: number
          table_id: string
        }
        Insert: {
          action_deadline?: string | null
          bb_seat: number
          community_cards?: Json
          completed_at?: string | null
          current_actor_seat?: number | null
          current_bet?: number
          dealer_seat: number
          deck_seed_commitment?: string | null
          deck_seed_internal?: string | null
          deck_seed_revealed?: string | null
          hand_number: number
          id?: string
          min_raise?: number
          phase?: Database["public"]["Enums"]["poker_hand_phase"]
          pots?: Json
          results?: Json | null
          sb_seat: number
          started_at?: string
          state_version?: number
          table_id: string
        }
        Update: {
          action_deadline?: string | null
          bb_seat?: number
          community_cards?: Json
          completed_at?: string | null
          current_actor_seat?: number | null
          current_bet?: number
          dealer_seat?: number
          deck_seed_commitment?: string | null
          deck_seed_internal?: string | null
          deck_seed_revealed?: string | null
          hand_number?: number
          id?: string
          min_raise?: number
          phase?: Database["public"]["Enums"]["poker_hand_phase"]
          pots?: Json
          results?: Json | null
          sb_seat?: number
          started_at?: string
          state_version?: number
          table_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "poker_hands_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "poker_tables"
            referencedColumns: ["id"]
          },
        ]
      }
      poker_hole_cards: {
        Row: {
          cards: Json
          hand_id: string
          id: string
          player_id: string
          seat_number: number
        }
        Insert: {
          cards: Json
          hand_id: string
          id?: string
          player_id: string
          seat_number: number
        }
        Update: {
          cards?: Json
          hand_id?: string
          id?: string
          player_id?: string
          seat_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "poker_hole_cards_hand_id_fkey"
            columns: ["hand_id"]
            isOneToOne: false
            referencedRelation: "poker_hands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "poker_hole_cards_hand_id_fkey"
            columns: ["hand_id"]
            isOneToOne: false
            referencedRelation: "poker_hands_public"
            referencedColumns: ["id"]
          },
        ]
      }
      poker_play_results: {
        Row: {
          best_hand_name: string | null
          best_hand_rank: number | null
          biggest_pot: number | null
          bot_count: number
          club_id: string | null
          created_at: string
          duration_seconds: number | null
          final_chips: number
          game_mode: string
          hands_played: number
          hands_won: number
          id: string
          starting_chips: number
          user_id: string
        }
        Insert: {
          best_hand_name?: string | null
          best_hand_rank?: number | null
          biggest_pot?: number | null
          bot_count?: number
          club_id?: string | null
          created_at?: string
          duration_seconds?: number | null
          final_chips?: number
          game_mode?: string
          hands_played?: number
          hands_won?: number
          id?: string
          starting_chips?: number
          user_id?: string
        }
        Update: {
          best_hand_name?: string | null
          best_hand_rank?: number | null
          biggest_pot?: number | null
          bot_count?: number
          club_id?: string | null
          created_at?: string
          duration_seconds?: number | null
          final_chips?: number
          game_mode?: string
          hands_played?: number
          hands_won?: number
          id?: string
          starting_chips?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "poker_play_results_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      poker_seats: {
        Row: {
          consecutive_timeouts: number
          id: string
          joined_at: string
          last_action_at: string | null
          player_id: string | null
          seat_number: number
          stack: number
          status: Database["public"]["Enums"]["poker_seat_status"]
          table_id: string
        }
        Insert: {
          consecutive_timeouts?: number
          id?: string
          joined_at?: string
          last_action_at?: string | null
          player_id?: string | null
          seat_number: number
          stack?: number
          status?: Database["public"]["Enums"]["poker_seat_status"]
          table_id: string
        }
        Update: {
          consecutive_timeouts?: number
          id?: string
          joined_at?: string
          last_action_at?: string | null
          player_id?: string | null
          seat_number?: number
          stack?: number
          status?: Database["public"]["Enums"]["poker_seat_status"]
          table_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "poker_seats_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "poker_tables"
            referencedColumns: ["id"]
          },
        ]
      }
      poker_tables: {
        Row: {
          ante: number
          big_blind: number
          blind_timer_minutes: number
          club_id: string | null
          created_at: string
          created_by: string
          id: string
          invite_code: string | null
          max_buy_in: number
          max_seats: number
          min_buy_in: number
          name: string
          small_blind: number
          status: Database["public"]["Enums"]["poker_table_status"]
          table_type: Database["public"]["Enums"]["poker_table_type"]
          tournament_id: string | null
          updated_at: string
        }
        Insert: {
          ante?: number
          big_blind?: number
          blind_timer_minutes?: number
          club_id?: string | null
          created_at?: string
          created_by?: string
          id?: string
          invite_code?: string | null
          max_buy_in?: number
          max_seats?: number
          min_buy_in?: number
          name: string
          small_blind?: number
          status?: Database["public"]["Enums"]["poker_table_status"]
          table_type?: Database["public"]["Enums"]["poker_table_type"]
          tournament_id?: string | null
          updated_at?: string
        }
        Update: {
          ante?: number
          big_blind?: number
          blind_timer_minutes?: number
          club_id?: string | null
          created_at?: string
          created_by?: string
          id?: string
          invite_code?: string | null
          max_buy_in?: number
          max_seats?: number
          min_buy_in?: number
          name?: string
          small_blind?: number
          status?: Database["public"]["Enums"]["poker_table_status"]
          table_type?: Database["public"]["Enums"]["poker_table_type"]
          tournament_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "poker_tables_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "poker_tables_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "poker_tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      poker_tournament_players: {
        Row: {
          eliminated_at: string | null
          finish_position: number | null
          id: string
          payout_amount: number | null
          player_id: string
          registered_at: string
          seat_number: number | null
          stack: number
          status: string
          table_id: string | null
          tournament_id: string
        }
        Insert: {
          eliminated_at?: string | null
          finish_position?: number | null
          id?: string
          payout_amount?: number | null
          player_id: string
          registered_at?: string
          seat_number?: number | null
          stack?: number
          status?: string
          table_id?: string | null
          tournament_id: string
        }
        Update: {
          eliminated_at?: string | null
          finish_position?: number | null
          id?: string
          payout_amount?: number | null
          player_id?: string
          registered_at?: string
          seat_number?: number | null
          stack?: number
          status?: string
          table_id?: string | null
          tournament_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "poker_tournament_players_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "poker_tables"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "poker_tournament_players_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "poker_tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      poker_tournaments: {
        Row: {
          blind_schedule: Json
          club_id: string | null
          completed_at: string | null
          created_at: string
          created_by: string
          current_level: number
          id: string
          invite_code: string | null
          late_reg_levels: number
          level_started_at: string | null
          max_players: number
          name: string
          payout_structure: Json | null
          players_per_table: number
          started_at: string | null
          starting_stack: number
          status: Database["public"]["Enums"]["poker_tournament_status"]
          tournament_type: string
        }
        Insert: {
          blind_schedule?: Json
          club_id?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string
          current_level?: number
          id?: string
          invite_code?: string | null
          late_reg_levels?: number
          level_started_at?: string | null
          max_players?: number
          name: string
          payout_structure?: Json | null
          players_per_table?: number
          started_at?: string | null
          starting_stack?: number
          status?: Database["public"]["Enums"]["poker_tournament_status"]
          tournament_type?: string
        }
        Update: {
          blind_schedule?: Json
          club_id?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string
          current_level?: number
          id?: string
          invite_code?: string | null
          late_reg_levels?: number
          level_started_at?: string | null
          max_players?: number
          name?: string
          payout_structure?: Json | null
          players_per_table?: number
          started_at?: string | null
          starting_stack?: number
          status?: Database["public"]["Enums"]["poker_tournament_status"]
          tournament_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "poker_tournaments_club_id_fkey"
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
      subscriptions: {
        Row: {
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          plan: string
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          trial_ends_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          trial_ends_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          trial_ends_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_preferences: {
        Row: {
          created_at: string
          currency: string | null
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
          push_event_unlocked: boolean
          push_game_completed: boolean
          push_game_started: boolean | null
          push_member_rsvp: boolean
          push_member_vote: boolean
          push_player_eliminated: boolean | null
          push_rebuy_addon: boolean | null
          push_rsvp_updates: boolean | null
          push_waitlist_promotion: boolean | null
          show_stats_publicly: boolean | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          currency?: string | null
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
          push_event_unlocked?: boolean
          push_game_completed?: boolean
          push_game_started?: boolean | null
          push_member_rsvp?: boolean
          push_member_vote?: boolean
          push_player_eliminated?: boolean | null
          push_rebuy_addon?: boolean | null
          push_rsvp_updates?: boolean | null
          push_waitlist_promotion?: boolean | null
          show_stats_publicly?: boolean | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          currency?: string | null
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
          push_event_unlocked?: boolean
          push_game_completed?: boolean
          push_game_started?: boolean | null
          push_member_rsvp?: boolean
          push_member_vote?: boolean
          push_player_eliminated?: boolean | null
          push_rebuy_addon?: boolean | null
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
      poker_hands_public: {
        Row: {
          action_deadline: string | null
          bb_seat: number | null
          community_cards: Json | null
          completed_at: string | null
          current_actor_seat: number | null
          current_bet: number | null
          dealer_seat: number | null
          deck_seed_commitment: string | null
          deck_seed_revealed: string | null
          hand_number: number | null
          id: string | null
          min_raise: number | null
          phase: Database["public"]["Enums"]["poker_hand_phase"] | null
          pots: Json | null
          results: Json | null
          sb_seat: number | null
          started_at: string | null
          state_version: number | null
          table_id: string | null
        }
        Insert: {
          action_deadline?: string | null
          bb_seat?: number | null
          community_cards?: Json | null
          completed_at?: string | null
          current_actor_seat?: number | null
          current_bet?: number | null
          dealer_seat?: number | null
          deck_seed_commitment?: string | null
          deck_seed_revealed?: never
          hand_number?: number | null
          id?: string | null
          min_raise?: number | null
          phase?: Database["public"]["Enums"]["poker_hand_phase"] | null
          pots?: Json | null
          results?: Json | null
          sb_seat?: number | null
          started_at?: string | null
          state_version?: number | null
          table_id?: string | null
        }
        Update: {
          action_deadline?: string | null
          bb_seat?: number | null
          community_cards?: Json | null
          completed_at?: string | null
          current_actor_seat?: number | null
          current_bet?: number | null
          dealer_seat?: number | null
          deck_seed_commitment?: string | null
          deck_seed_revealed?: never
          hand_number?: number | null
          id?: string | null
          min_raise?: number | null
          phase?: Database["public"]["Enums"]["poker_hand_phase"] | null
          pots?: Json | null
          results?: Json | null
          sb_seat?: number | null
          started_at?: string | null
          state_version?: number | null
          table_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "poker_hands_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "poker_tables"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      cleanup_expired_verifications: { Args: never; Returns: undefined }
      commit_poker_state: {
        Args: {
          _action_deadline: string
          _action_record: Json
          _community_cards: Json
          _completed_at: string
          _current_actor_seat: number
          _current_bet: number
          _deck_seed_revealed: string
          _expected_version: number
          _hand_id: string
          _min_raise: number
          _new_phase: string
          _pots: Json
          _results: Json
          _seat_updates: Json
        }
        Returns: Json
      }
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
      has_active_subscription: { Args: { _user_id: string }; Returns: boolean }
      has_club_role: {
        Args: {
          _club_id: string
          _role: Database["public"]["Enums"]["club_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_app_admin: { Args: { _user_id: string }; Returns: boolean }
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
      is_user_banned: { Args: { _user_id: string }; Returns: boolean }
      lookup_club_by_invite_code: {
        Args: { _invite_code: string }
        Returns: {
          id: string
          name: string
        }[]
      }
      read_poker_hand_state: {
        Args: { _hand_id: string; _table_id: string }
        Returns: Json
      }
      read_showdown_cards: { Args: { _hand_id: string }; Returns: Json }
    }
    Enums: {
      app_role: "superadmin" | "support"
      club_role: "owner" | "admin" | "member"
      poker_action_type:
        | "fold"
        | "check"
        | "call"
        | "raise"
        | "all_in"
        | "post_blind"
        | "post_ante"
      poker_hand_phase:
        | "preflop"
        | "flop"
        | "turn"
        | "river"
        | "showdown"
        | "complete"
      poker_seat_status: "active" | "sitting_out" | "disconnected"
      poker_table_status: "waiting" | "playing" | "paused" | "closed"
      poker_table_type: "friends" | "club" | "public"
      poker_tournament_status:
        | "registering"
        | "running"
        | "paused"
        | "completed"
        | "cancelled"
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
      app_role: ["superadmin", "support"],
      club_role: ["owner", "admin", "member"],
      poker_action_type: [
        "fold",
        "check",
        "call",
        "raise",
        "all_in",
        "post_blind",
        "post_ante",
      ],
      poker_hand_phase: [
        "preflop",
        "flop",
        "turn",
        "river",
        "showdown",
        "complete",
      ],
      poker_seat_status: ["active", "sitting_out", "disconnected"],
      poker_table_status: ["waiting", "playing", "paused", "closed"],
      poker_table_type: ["friends", "club", "public"],
      poker_tournament_status: [
        "registering",
        "running",
        "paused",
        "completed",
        "cancelled",
      ],
      rsvp_status: ["going", "maybe", "not_going"],
    },
  },
} as const
