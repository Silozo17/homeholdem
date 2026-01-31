import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export interface UserPreferences {
  id: string;
  user_id: string;
  // Email preferences
  email_event_created: boolean;
  email_event_reminder: boolean;
  email_rsvp_confirmation: boolean;
  email_waitlist_promotion: boolean;
  email_game_results: boolean;
  email_club_invites: boolean;
  // Push preferences
  push_rsvp_updates: boolean;
  push_date_finalized: boolean;
  push_waitlist_promotion: boolean;
  push_chat_messages: boolean;
  push_blinds_up: boolean;
  push_game_started: boolean;
  push_player_eliminated: boolean;
  push_rebuy_addon: boolean;
  // Other preferences
  show_stats_publicly: boolean;
  language: string;
  currency: string;
  created_at: string;
  updated_at: string;
}

const defaultPreferences: Omit<UserPreferences, 'id' | 'user_id' | 'created_at' | 'updated_at'> = {
  email_event_created: true,
  email_event_reminder: true,
  email_rsvp_confirmation: true,
  email_waitlist_promotion: true,
  email_game_results: true,
  email_club_invites: true,
  push_rsvp_updates: true,
  push_date_finalized: true,
  push_waitlist_promotion: true,
  push_chat_messages: true,
  push_blinds_up: true,
  push_game_started: true,
  push_player_eliminated: true,
  push_rebuy_addon: true,
  show_stats_publicly: true,
  language: 'en',
  currency: 'GBP',
};

export function useUserPreferences() {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPreferences = useCallback(async () => {
    if (!user) {
      setPreferences(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Try to get existing preferences
      const { data, error: fetchError } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (fetchError) {
        throw fetchError;
      }

      if (data) {
        setPreferences(data as UserPreferences);
      } else {
        // Create default preferences if none exist
        const { data: newData, error: insertError } = await supabase
          .from('user_preferences')
          .insert({ user_id: user.id })
          .select()
          .single();

        if (insertError) {
          throw insertError;
        }

        setPreferences(newData as UserPreferences);
      }
    } catch (err: any) {
      console.error('Error fetching preferences:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchPreferences();
  }, [fetchPreferences]);

  const updatePreference = useCallback(async <K extends keyof typeof defaultPreferences>(
    key: K,
    value: typeof defaultPreferences[K]
  ): Promise<boolean> => {
    if (!user || !preferences) return false;

    try {
      // Optimistic update
      setPreferences(prev => prev ? { ...prev, [key]: value } : null);

      const { error: updateError } = await supabase
        .from('user_preferences')
        .update({ [key]: value })
        .eq('user_id', user.id);

      if (updateError) {
        // Revert on error
        setPreferences(prev => prev ? { ...prev, [key]: !value } : null);
        throw updateError;
      }

      return true;
    } catch (err: any) {
      console.error('Error updating preference:', err);
      setError(err.message);
      return false;
    }
  }, [user, preferences]);

  return {
    preferences,
    loading,
    error,
    updatePreference,
    refetch: fetchPreferences,
  };
}
