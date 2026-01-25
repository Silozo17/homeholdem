import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export interface SubscriptionState {
  subscribed: boolean;
  status: 'trialing' | 'active' | 'expired' | 'canceled' | null;
  plan: 'monthly' | 'annual' | null;
  trialEndsAt: Date | null;
  currentPeriodEnd: Date | null;
  loading: boolean;
  error: string | null;
}

export function useSubscription() {
  const { user, session } = useAuth();
  const [state, setState] = useState<SubscriptionState>({
    subscribed: false,
    status: null,
    plan: null,
    trialEndsAt: null,
    currentPeriodEnd: null,
    loading: true,
    error: null,
  });

  const checkSubscription = useCallback(async () => {
    if (!session?.access_token) {
      setState(prev => ({ ...prev, loading: false }));
      return;
    }

    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      const { data, error } = await supabase.functions.invoke('check-subscription', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;

      setState({
        subscribed: data.subscribed,
        status: data.status,
        plan: data.plan,
        trialEndsAt: data.trial_ends_at ? new Date(data.trial_ends_at) : null,
        currentPeriodEnd: data.current_period_end ? new Date(data.current_period_end) : null,
        loading: false,
        error: null,
      });
    } catch (err) {
      console.error('Error checking subscription:', err);
      // Keep previous subscription state on error to prevent UI disruption
      // This prevents redirects/paywall triggers when network issues occur during active use
      setState(prev => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : 'Failed to check subscription',
        // Preserve previous subscription values - don't reset on network errors
      }));
    }
  }, [session?.access_token]);

  // Check subscription on mount and when user changes
  useEffect(() => {
    if (user) {
      checkSubscription();
    } else {
      setState({
        subscribed: false,
        status: null,
        plan: null,
        trialEndsAt: null,
        currentPeriodEnd: null,
        loading: false,
        error: null,
      });
    }
  }, [user, checkSubscription]);

  // Auto-refresh subscription status every minute
  useEffect(() => {
    if (!user) return;

    const interval = setInterval(checkSubscription, 60000);
    return () => clearInterval(interval);
  }, [user, checkSubscription]);

  const isActive = state.subscribed && (state.status === 'active' || state.status === 'trialing');
  const isTrialing = state.status === 'trialing';

  const daysRemaining = (() => {
    if (!state.subscribed) return 0;
    const endDate = isTrialing ? state.trialEndsAt : state.currentPeriodEnd;
    if (!endDate) return 0;
    const now = new Date();
    const diff = endDate.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  })();

  return {
    ...state,
    isActive,
    isTrialing,
    daysRemaining,
    refetch: checkSubscription,
  };
}
